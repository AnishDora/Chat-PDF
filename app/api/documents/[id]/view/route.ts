import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// GET - Get signed URL for viewing a document
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
    // First, verify the document belongs to the user
    const { data: document, error: fetchError } = await supabaseAdmin
      .from("documents")
      .select("storage_path, status")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.status === "failed") {
      return NextResponse.json({ 
        error: "Document processing failed",
        status: document.status
      }, { status: 400 });
    }

    // Allow viewing even if status is "processing" - just show a warning
    if (document.status === "processing") {
      console.warn(`Document ${id} is still processing, but allowing view`);
    }

    // Generate signed URL for the PDF
    const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
      .from("pdfs")
      .createSignedUrl(document.storage_path, 3600); // 1 hour expiry

    if (urlError) {
      return NextResponse.json({ error: urlError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      url: signedUrl.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    });

  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
