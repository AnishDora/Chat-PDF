import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// GET - Get preview metadata for a document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { data: document, error: fetchError } = await supabaseAdmin
      .from("documents")
      .select("storage_path, status, source_type, source_url, title")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.status === "failed") {
      return NextResponse.json({ 
        error: "Source processing failed",
        status: document.status
      }, { status: 400 });
    }

    // Fetch a short preview snippet from the first chunk when available
    const { data: snippetData } = await supabaseAdmin
      .from("document_chunks")
      .select("content")
      .eq("document_id", id)
      .order("chunk_index", { ascending: true })
      .limit(1)
      .maybeSingle();

    const snippet = snippetData?.content?.slice(0, 600) ?? null;

    if (document.source_type === "pdf") {
      if (!document.storage_path) {
        return NextResponse.json({ error: "PDF is missing from storage" }, { status: 404 });
      }
      const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
        .from("pdfs")
        .createSignedUrl(document.storage_path, 3600);

      if (urlError) {
        return NextResponse.json({ error: urlError.message }, { status: 500 });
      }

      return NextResponse.json({
        type: "pdf",
        status: document.status,
        title: document.title,
        signedUrl: signedUrl.signedUrl,
        sourceUrl: null,
        snippet,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
    }

    if (document.source_type === "screenshot") {
      if (!document.storage_path) {
        return NextResponse.json({ error: "Screenshot is missing from storage" }, { status: 404 });
      }

      const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
        .from("pdfs")
        .createSignedUrl(document.storage_path, 3600);

      if (urlError) {
        return NextResponse.json({ error: urlError.message }, { status: 500 });
      }

      return NextResponse.json({
        type: "screenshot",
        status: document.status,
        title: document.title,
        signedUrl: signedUrl.signedUrl,
        sourceUrl: null,
        snippet,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
    }

    return NextResponse.json({
      type: document.source_type,
      status: document.status,
      title: document.title,
      signedUrl: null,
      sourceUrl: document.source_url,
      snippet,
    });

  } catch (error) {
    console.error("Error preparing document preview:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
