import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// GET - Get messages for a chat
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // First verify the chat belongs to the user
    const { data: chat, error: chatError } = await supabaseAdmin
      .from("chats")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Get messages for the chat
    const { data: messages, error, count } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("chat_id", params.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      messages: messages || [],
      total: count,
      limit,
      offset
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// POST - Add a message to a chat
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { content, is_user = true } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // First verify the chat belongs to the user
    const { data: chat, error: chatError } = await supabaseAdmin
      .from("chats")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Create the message
    const { data: message, error } = await supabaseAdmin
      .from("messages")
      .insert({
        chat_id: params.id,
        user_id: userId,
        content: content.trim(),
        is_user: is_user,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update the chat's updated_at timestamp
    await supabaseAdmin
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.id);

    return NextResponse.json({ 
      message,
      success: true
    });

  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
