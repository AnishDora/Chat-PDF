import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { pdfProcessor } from "@/lib/chunk";
import type { DocumentChunk } from "@/lib/chunk";
import { ragSystem } from "@/lib/rag";
import { generateDocumentTitle } from "@/lib/generateTitle";
import { extractTextFromUrl } from "@/lib/sources/url";
import { extractTextFromImage, SUPPORTED_OCR_MIME_TYPES } from "@/lib/sources/image";
import { SourceType, isSourceType } from "@/lib/sourceTypes";

export const runtime = "nodejs";

const STORAGE_BUCKET = "pdfs"; // reused for all stored uploads
const MAX_URLS_PER_REQUEST = 5;

interface DocumentRow {
  id: string;
  title: string;
  source_type: SourceType;
  status: string;
}

interface UploadSuccess {
  id: string;
  title: string;
  source_type: SourceType;
}

interface UploadFailure {
  file: string;
  error: string;
}

type UploadResult =
  | { success: true; data: UploadSuccess; file: string }
  | { success: false; error: string; file: string };

const guessMimeType = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
};

const stripExtension = (name: string): string => name.replace(/\.[^.]+$/, "");

const detectSourceType = (file: File, override?: string | null): SourceType | null => {
  const loweredOverride = override?.toLowerCase();
  if (loweredOverride && isSourceType(loweredOverride)) {
    return loweredOverride;
  }

  const mime = guessMimeType(file);
  if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "pdf";
  }

  if (mime.startsWith("image/") || /\.(png|jpg|jpeg)$/i.test(file.name)) {
    return "screenshot";
  }

  return null;
};

const createDocumentRecord = async ({
  userId,
  title,
  sourceType,
  storagePath,
  sourceUrl,
  bytes,
  metadata,
}: {
  userId: string;
  title: string;
  sourceType: SourceType;
  storagePath?: string | null;
  sourceUrl?: string | null;
  bytes?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<DocumentRow> => {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      user_id: userId,
      title,
      storage_path: storagePath ?? null,
      source_type: sourceType,
      source_url: sourceUrl ?? null,
      bytes: bytes ?? null,
      metadata: metadata ?? {},
      status: "processing",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create document record");
  }

  return data as DocumentRow;
};

const finalizeDocument = async (
  documentId: string,
  patch: Partial<{ status: string; page_count: number; title: string; metadata: Record<string, unknown> }>
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("documents")
    .update(patch)
    .eq("id", documentId);

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }
};

const insertChunks = async (userId: string, chunks: DocumentChunk[]): Promise<void> => {
  if (chunks.length === 0) return;

  const chunkRecords = chunks.map(chunk => ({
    id: chunk.id,
    document_id: chunk.document_id,
    user_id: userId,
    content: chunk.content,
    page_number: chunk.page_number,
    chunk_index: chunk.chunk_index,
  }));

  const { error } = await supabaseAdmin
    .from("document_chunks")
    .insert(chunkRecords);

  if (error) {
    throw new Error(`Failed to insert document chunks: ${error.message}`);
  }
};

const isEmbeddingsGracefulError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("quota") || message.includes("429") || message.includes("faiss");
};

const addToVectorStore = async (chunks: DocumentChunk[]): Promise<void> => {
  if (chunks.length === 0) return;
  try {
    await ragSystem.addDocumentsToVectorStore(chunks);
  } catch (error) {
    if (isEmbeddingsGracefulError(error)) {
      console.warn("Vector store unavailable, continuing with fallback mode", error);
      return;
    }
    throw error;
  }
};

const processPdf = async (file: File, userId: string): Promise<UploadResult> => {
  const fallbackTitle = stripExtension(file.name) || "Uploaded PDF";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const storagePath = `${STORAGE_BUCKET}/${userId}/pdf/${crypto.randomUUID()}.pdf`;

  const upload = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (upload.error) {
    return {
      success: false,
      error: `Storage upload failed: ${upload.error.message}`,
      file: file.name,
    };
  }

  const metadata = {
    original_filename: file.name,
    mime_type: "application/pdf",
  };

  let document: DocumentRow | null = null;

  try {
    document = await createDocumentRecord({
      userId,
      title: fallbackTitle,
      sourceType: "pdf",
      storagePath,
      bytes: file.size,
      metadata,
    });

    const { text, pageCount } = await pdfProcessor.extractTextFromPDF(buffer);
    const safePageCount = Math.max(pageCount || 1, 1);

    const generatedTitle = await generateDocumentTitle(text, "pdf", fallbackTitle);
    const finalTitle = generatedTitle || fallbackTitle;

    const chunks = await pdfProcessor.chunkText(text, document.id, safePageCount, {
      title: finalTitle,
      source_type: "pdf",
    });

    await insertChunks(userId, chunks);

    await finalizeDocument(document.id, {
      status: "ready",
      page_count: safePageCount,
      title: finalTitle,
      metadata: {
        ...metadata,
        auto_title: finalTitle,
        auto_title_generated: finalTitle !== fallbackTitle,
      },
    });

    await addToVectorStore(chunks);

    return {
      success: true,
      data: { id: document.id, title: finalTitle, source_type: "pdf" },
      file: file.name,
    };
  } catch (error) {
    console.error("Error processing PDF:", error);

    if (document) {
      await finalizeDocument(document.id, { status: "failed" }).catch(finalizeError => {
        console.error("Failed to mark document as failed:", finalizeError);
      });
    } else {
      await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath])
        .catch(removeError => {
          console.error("Failed to clean up uploaded PDF:", removeError);
        });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF processing failed",
      file: file.name,
    };
  }
};

const processScreenshot = async (file: File, userId: string): Promise<UploadResult> => {
  const mimeType = guessMimeType(file);
  if (!SUPPORTED_OCR_MIME_TYPES.has(mimeType)) {
    return {
      success: false,
      error: `Unsupported screenshot type: ${mimeType}`,
      file: file.name,
    };
  }

  const fallbackTitle = stripExtension(file.name) || "Screenshot";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const storagePath = `${STORAGE_BUCKET}/${userId}/screenshot/${crypto.randomUUID()}.${extension}`;

  const upload = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (upload.error) {
    return {
      success: false,
      error: `Storage upload failed: ${upload.error.message}`,
      file: file.name,
    };
  }

  const metadata = {
    original_filename: file.name,
    mime_type: mimeType,
  };

  let document: DocumentRow | null = null;

  try {
    document = await createDocumentRecord({
      userId,
      title: fallbackTitle,
      sourceType: "screenshot",
      storagePath,
      bytes: file.size,
      metadata,
    });

    const text = await extractTextFromImage(buffer, mimeType);
    const generatedTitle = await generateDocumentTitle(text, "screenshot", fallbackTitle);
    const finalTitle = generatedTitle || fallbackTitle;

    const chunks = await pdfProcessor.chunkText(text, document.id, 1, {
      title: finalTitle,
      source_type: "screenshot",
    });

    await insertChunks(userId, chunks);

    await finalizeDocument(document.id, {
      status: "ready",
      page_count: 1,
      title: finalTitle,
      metadata: {
        ...metadata,
        auto_title: finalTitle,
        auto_title_generated: finalTitle !== fallbackTitle,
      },
    });

    await addToVectorStore(chunks);

    return {
      success: true,
      data: { id: document.id, title: finalTitle, source_type: "screenshot" },
      file: file.name,
    };
  } catch (error) {
    console.error("Error processing screenshot:", error);

    if (document) {
      await finalizeDocument(document.id, { status: "failed" }).catch(finalizeError => {
        console.error("Failed to mark screenshot as failed:", finalizeError);
      });
    } else {
      await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath])
        .catch(removeError => {
          console.error("Failed to clean up uploaded screenshot:", removeError);
        });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Screenshot processing failed",
      file: file.name,
    };
  }
};

const processUrl = async (rawUrl: string, userId: string): Promise<UploadResult> => {
  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(rawUrl).toString();
  } catch {
    return {
      success: false,
      error: "Invalid URL provided",
      file: rawUrl,
    };
  }

  const fallbackTitle = normalizedUrl.replace(/https?:\/\//, "").split("/")[0] || "Imported URL";

  let document: DocumentRow | null = null;

  try {
    const { text, meta } = await extractTextFromUrl(normalizedUrl);
    const generatedTitle = await generateDocumentTitle(text, "url", meta.title || fallbackTitle);
    const finalTitle = generatedTitle || meta.title || fallbackTitle;

    const metadata = {
      site_name: meta.siteName,
      description: meta.description,
      auto_title: finalTitle,
      auto_title_generated: finalTitle !== (meta.title || fallbackTitle),
    };

    document = await createDocumentRecord({
      userId,
      title: finalTitle,
      sourceType: "url",
      sourceUrl: normalizedUrl,
      bytes: text.length,
      metadata,
    });

    const chunks = await pdfProcessor.chunkText(text, document.id, 1, {
      title: finalTitle,
      source_type: "url",
      source_url: normalizedUrl,
    });

    await insertChunks(userId, chunks);

    await finalizeDocument(document.id, {
      status: "ready",
      page_count: 1,
      title: finalTitle,
      metadata,
    });

    await addToVectorStore(chunks);

    return {
      success: true,
      data: { id: document.id, title: finalTitle, source_type: "url" },
      file: normalizedUrl,
    };
  } catch (error) {
    console.error("Error processing URL:", error);

    if (document) {
      await finalizeDocument(document.id, { status: "failed" }).catch(finalizeError => {
        console.error("Failed to mark URL document as failed:", finalizeError);
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "URL processing failed",
      file: rawUrl,
    };
  }
};

const buildResponse = (results: UploadResult[]) => {
  const successful: UploadSuccess[] = [];
  const failed: UploadFailure[] = [];

  results.forEach(result => {
    if (result.success) {
      successful.push(result.data);
    } else {
      failed.push({ file: result.file, error: result.error });
    }
  });

  if (failed.length === 0) {
    return NextResponse.json({
      success: true,
      documents: successful,
      message: `Processed ${successful.length} source${successful.length === 1 ? '' : 's'}`,
    });
  }

  if (successful.length === 0) {
    return NextResponse.json({
      success: false,
      failed,
      error: "All sources failed to process",
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    documents: successful,
    failed,
    message: `Processed ${successful.length} source${successful.length === 1 ? '' : 's'}, ${failed.length} failed`,
  });
};

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const urls = Array.isArray(body?.urls) ? body.urls : typeof body?.url === "string" ? [body.url] : [];

      if (urls.length === 0) {
        return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
      }

      if (urls.length > MAX_URLS_PER_REQUEST) {
        return NextResponse.json({ error: `Maximum ${MAX_URLS_PER_REQUEST} URLs per request` }, { status: 400 });
      }

      const results = await Promise.all(urls.map((url: string) => processUrl(url, userId)));
      return buildResponse(results);
    }

    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const overrideType = form.get("sourceType");

    const results = await Promise.all(files.map(async (file) => {
      const sourceType = detectSourceType(file, typeof overrideType === "string" ? overrideType : null);

      if (!sourceType) {
        return {
          success: false as const,
          error: "Unsupported file type",
          file: file.name,
        };
      }

      if (sourceType === "pdf") {
        return processPdf(file, userId);
      }

      if (sourceType === "screenshot") {
        return processScreenshot(file, userId);
      }

      return {
        success: false as const,
        error: `Unsupported upload source type: ${sourceType}`,
        file: file.name,
      };
    }));

    return buildResponse(results);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error during upload" }, { status: 500 });
  }
}
