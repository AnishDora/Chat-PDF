import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// GET - List user's chats
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get chats with message count
    const { data: chats, error, count } = await supabaseAdmin
      .from("chats")
      .select(`
        *,
        messages(count)
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to include message count
    const transformedChats = chats?.map(chat => ({
      ...chat,
      message_count: chat.messages?.[0]?.count || 0
    })) || [];

    return NextResponse.json({ 
      chats: transformedChats,
      total: count,
      limit,
      offset
    });

  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// POST - Create a new chat
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, document_ids = [] } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Chat title is required" }, { status: 400 });
    }

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

    const { data, error } = await supabaseAdmin
      .from("chats")
      .insert({
        user_id: userId,
        title: title.trim(),
        document_ids: document_ids,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      chat: data,
      message: "Chat created successfully"
    });

  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// DELETE - Delete a chat
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("id");
    
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }

    // Delete chat (messages will be deleted automatically due to CASCADE)
    const { error } = await supabaseAdmin
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Chat deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
