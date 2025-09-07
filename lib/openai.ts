import OpenAI from "openai";

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY env var");
  }
  return new OpenAI({ apiKey });
}

export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large";

export const DEFAULT_EMBEDDING_MODEL: EmbeddingModel = "text-embedding-3-small";

