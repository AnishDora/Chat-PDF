import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { ragSystem } from "@/lib/rag";
import { generateChatTitleFromMessage } from "@/lib/generateTitle";

export const runtime = "nodejs";

// GET - Get messages for a chat
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
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

    const { id } = await ctx.params;

    // First verify the chat belongs to the user
    const { data: chat, error: chatError } = await supabaseAdmin
      .from("chats")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Get messages for the chat
    const { data: messages, error, count } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("chat_id", id)
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
  ctx: { params: Promise<{ id: string }> }
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

    const { id } = await ctx.params;

    // First verify the chat belongs to the user and get associated documents
    const { data: chat, error: chatError } = await supabaseAdmin
      .from("chats")
      .select(`
        id,
        title,
        document_ids
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Create the user message
    const { data: userMessage, error: userMessageError } = await supabaseAdmin
      .from("messages")
      .insert({
        chat_id: id,
        user_id: userId,
        content: content.trim(),
        is_user: true,
      })
      .select()
      .single();

    if (userMessageError) {
      return NextResponse.json({ error: userMessageError.message }, { status: 500 });
    }

    const chatUpdates: { title?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (
      is_user &&
      chat.title &&
      /^new chat/i.test(chat.title.trim())
    ) {
      let documentTitles: string[] = [];
      if (Array.isArray(chat.document_ids) && chat.document_ids.length > 0) {
        const { data: docs, error: docsError } = await supabaseAdmin
          .from("documents")
          .select("title")
          .in("id", chat.document_ids);

        if (docsError) {
          console.error("Error fetching document titles for chat naming:", docsError);
        } else {
          documentTitles = (docs || [])
            .map(doc => (typeof doc.title === "string" ? doc.title : null))
            .filter((title): title is string => Boolean(title && title.trim()))
            .map(title => title.trim());
        }
      }

      const generatedTitle = await generateChatTitleFromMessage(
        content.trim(),
        documentTitles,
        chat.title
      );

      if (generatedTitle && generatedTitle !== chat.title) {
        chatUpdates.title = generatedTitle;
      }
    }

    // If it's a user message, generate AI response using RAG
    if (is_user) {
      try {
        // Get document IDs associated with this chat
        const documentIds = chat.document_ids || [];
        
        let aiResponse = "I don't have any documents to reference. Please upload some PDFs to this chat first.";
        
        if (documentIds.length > 0) {
          // Generate AI response using RAG
          aiResponse = await ragSystem.queryDocuments(content.trim(), userId, documentIds);
        }

        // Create the AI response message
        const { data: aiMessage, error: aiMessageError } = await supabaseAdmin
          .from("messages")
          .insert({
            chat_id: id,
            user_id: userId,
            content: aiResponse,
            is_user: false,
          })
          .select()
          .single();

        if (aiMessageError) {
          console.error("Error creating AI message:", aiMessageError);
          // Continue without AI response
        }

        await supabaseAdmin
          .from("chats")
          .update(chatUpdates)
          .eq("id", id);

        return NextResponse.json({ 
          userMessage,
          aiMessage: aiMessage || null,
          success: true
        });

      } catch (ragError) {
        console.error("Error generating AI response:", ragError);
        
        // Create a fallback AI message
        const { data: fallbackMessage } = await supabaseAdmin
          .from("messages")
          .insert({
            chat_id: id,
            user_id: userId,
            content: "I encountered an error while processing your question. Please try again.",
            is_user: false,
          })
          .select()
          .single();

        await supabaseAdmin
          .from("chats")
          .update(chatUpdates)
          .eq("id", id);

        return NextResponse.json({ 
          userMessage,
          aiMessage: fallbackMessage,
          success: true
        });
      }
    } else {
      // For non-user messages, just return the message
      await supabaseAdmin
        .from("chats")
        .update(chatUpdates)
        .eq("id", id);

      return NextResponse.json({ 
        message: userMessage,
        success: true
      });
    }

  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
