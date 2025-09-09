import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// GET - Get a specific chat with messages
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
    const { data: chat, error } = await supabaseAdmin
      .from("chats")
      .select(`
        *,
        messages(*)
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort messages by created_at
    if (chat.messages) {
      chat.messages.sort(
        (
          a: { created_at: string },
          b: { created_at: string }
        ) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return NextResponse.json({ chat });

  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// PATCH - Update chat title or documents
export async function PATCH(
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
    const body = await req.json();
    const { title, document_ids } = body;

    // Only allow updating specific fields
    const updateData: { title?: string; document_ids?: string[]; updated_at?: string } = {};
    if (title !== undefined) updateData.title = title.trim();
    if (document_ids !== undefined) {
      // Verify that all document IDs belong to the user
      if (document_ids.length > 0) {
        const { data: documents, error: docError } = await supabaseAdmin
          .from("documents")
          .select("id")
          .eq("user_id", userId)
          .in("id", document_ids);

        if (docError) {
          return NextResponse.json({ error: docError.message }, { status: 500 });
        }

        if (documents.length !== document_ids.length) {
          return NextResponse.json({ 
            error: "Some documents not found or don't belong to you" 
          }, { status: 400 });
        }
      }
      updateData.document_ids = document_ids;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("chats")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chat: data });

  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
