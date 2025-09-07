import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOpenAI, DEFAULT_EMBEDDING_MODEL } from "@/lib/openai";

export async function embedTexts(texts: string[]) {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: DEFAULT_EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function embedText(text: string) {
  const [e] = await embedTexts([text]);
  return e;
}

export async function retrieveMatches(opts: {
  userId: string;
  queryEmbedding: number[];
  documentIds?: string[];
  matchCount?: number;
  minSimilarity?: number;
}) {
  const { userId, queryEmbedding, documentIds, matchCount = 8, minSimilarity = 0.2 } = opts;
  // Use RPC for vector search; fall back to brute-force if RPC not available
  try {
    const { data, error } = await supabaseAdmin.rpc("match_document_chunks", {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_match_count: matchCount,
      p_min_similarity: minSimilarity,
      p_document_ids: documentIds ?? null,
    });
    if (error) throw error;
    return data as { id: string; document_id: string; content: string; similarity: number }[];
  } catch (e) {
    // Brute-force fallback
    const base = supabaseAdmin
      .from("document_chunks")
      .select("id, document_id, content, embedding")
      .eq("user_id", userId);
    const query = documentIds?.length ? base.in("document_id", documentIds) : base;
    const { data, error } = await query;
    if (error) throw error;
    const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
    const norm = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const qn = norm(queryEmbedding);
    const scored = (data || []).map((row: any) => {
      const e = row.embedding as number[];
      const sim = e && e.length ? dot(e, queryEmbedding) / (norm(e) * qn) : 0;
      return { id: row.id, document_id: row.document_id, content: row.content, similarity: sim };
    });
    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, matchCount);
  }
}

export function buildSystemPrompt() {
  return `You are a helpful assistant that only answers using the provided context from the user's PDFs. 
If the answer is not clearly contained in the context, say you don't know and suggest the user upload a relevant PDF. 
Do not use outside knowledge.`;
}

export function buildUserPrompt(question: string, contexts: { content: string }[]) {
  const contextText = contexts.map((c, i) => `Source ${i + 1}:
${c.content}`).join("\n\n");
  return `Context:
${contextText}

Question: ${question}

Answer using only the context above.`;
}

