import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/rag";
// @ts-expect-error: ESM types not provided
import pdf from "pdf-parse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    
    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate all files first
    const invalidFiles = files.filter(file => 
      file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
    );
    
    if (invalidFiles.length > 0) {
      return NextResponse.json({ 
        error: `Invalid file types: ${invalidFiles.map(f => f.name).join(", ")}` 
      }, { status: 400 });
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[]
    };

    // Process files in parallel for better performance
    const uploadPromises = files.map(async (file) => {
      try {
        const storagePath = `pdfs/${userId}/${crypto.randomUUID()}.pdf`;
        const arrayBuf = await file.arrayBuffer();
        
        // Upload to Supabase Storage
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("pdfs")
          .upload(storagePath, Buffer.from(arrayBuf), {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        // Create document record (start as processing)
        const { data, error } = await supabaseAdmin
          .from("documents")
          .insert({
            user_id: userId,
            title: file.name.replace(/\.pdf$/i, ""),
            storage_path: storagePath,
            bytes: file.size,
            status: "processing",
          })
          .select()
          .single();

        if (error) {
          // Clean up uploaded file if database insert fails
          await supabaseAdmin.storage
            .from("pdfs")
            .remove([storagePath]);
          throw new Error(`Database insert failed: ${error.message}`);
        }

        // Extract text from PDF
        let pageCount: number | undefined = undefined;
        let text = "";
        try {
          const parsed = await pdf(Buffer.from(arrayBuf));
          text = parsed.text || "";
          pageCount = parsed.numpages;
        } catch (e) {
          console.warn(`Failed to parse PDF text for ${file.name}:`, e);
        }

        if (text.trim()) {
          // Chunk
          const chunks = chunkText(text, { chunkSize: 1500, overlap: 250 });
          // Embed in batches of 64
          const batchSize = 64;
          const allEmbeddings: number[][] = [];
          for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize).map((c) => c.content);
            const embeddings = await embedTexts(batch);
            allEmbeddings.push(...embeddings);
          }
          // Insert chunks
          const rows = chunks.map((c, idx) => ({
            user_id: userId,
            document_id: data.id,
            chunk_index: c.index,
            content: c.content,
            token_count: c.content.length, // rough count; replace with tokenizer if needed
            embedding: allEmbeddings[idx],
          }));
          // Insert in batches to avoid payload size issues
          for (let i = 0; i < rows.length; i += 500) {
            const slice = rows.slice(i, i + 500);
            const { error: insertErr } = await supabaseAdmin
              .from("document_chunks")
              .insert(slice);
            if (insertErr) throw insertErr;
          }
        }

        // Update document status
        await supabaseAdmin
          .from("documents")
          .update({ status: "ready", page_count: pageCount ?? null })
          .eq("id", data.id);

        return { success: true, data, file: file.name };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error",
          file: file.name 
        };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Separate successful and failed uploads
    uploadResults.forEach(result => {
      if (result.success) {
        results.successful.push(result.data);
      } else {
        results.failed.push({
          file: result.file,
          error: result.error
        });
      }
    });

    // Return appropriate response based on results
    if (results.failed.length === 0) {
      return NextResponse.json({ 
        success: true,
        documents: results.successful,
        message: `Successfully uploaded ${results.successful.length} file(s)`
      });
    } else if (results.successful.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "All uploads failed",
        failed: results.failed
      }, { status: 500 });
    } else {
      return NextResponse.json({ 
        success: true,
        documents: results.successful,
        failed: results.failed,
        message: `Uploaded ${results.successful.length} file(s), ${results.failed.length} failed`
      });
    }

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ 
      error: "Internal server error during upload" 
    }, { status: 500 });
  }
}
