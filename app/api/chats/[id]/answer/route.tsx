import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { buildSystemPrompt, buildUserPrompt, embedText, retrieveMatches } from "@/lib/rag";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const question = (body?.question || "").toString().trim();
    if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });

    // Verify chat belongs to user and fetch documents
    const { data: chat, error: chatErr } = await supabaseAdmin
      .from("chats")
      .select("id, document_ids")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (chatErr || !chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    const documentIds = (chat.document_ids || []) as string[];
    if (!documentIds.length) {
      // Save assistant reply indicating missing docs
      const { data: msg } = await supabaseAdmin
        .from("messages")
        .insert({ chat_id: id, user_id: userId, content: "No documents linked to this chat. Add PDFs and ask again.", is_user: false })
        .select()
        .single();
      return NextResponse.json({ message: msg });
    }

    // Embed the question
    const queryEmbedding = await embedText(question);

    // Retrieve relevant chunks for this user and these documents
    const matches = await retrieveMatches({
      userId,
      queryEmbedding,
      documentIds,
      matchCount: 8,
      minSimilarity: 0.2,
    });

    // If no relevant chunks, respond accordingly
    if (!matches.length) {
      const { data: msg } = await supabaseAdmin
        .from("messages")
        .insert({ chat_id: id, user_id: userId, content: "I couldn't find relevant information in your PDFs to answer that.", is_user: false })
        .select()
        .single();
      return NextResponse.json({ message: msg });
    }

    // Construct prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(question, matches.map((m) => ({ content: m.content })));

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "I couldn't generate an answer.";

    // Save assistant response as a message
    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("messages")
      .insert({ chat_id: id, user_id: userId, content: answer, is_user: false })
      .select()
      .single();
    if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });

    // Touch chat updated_at
    await supabaseAdmin.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ message: saved });
  } catch (e: any) {
    console.error("Answer error:", e);
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}

