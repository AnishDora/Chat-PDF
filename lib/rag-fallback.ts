// Fallback RAG system that works without OpenAI API calls
// Uses simple database keyword search against stored chunks
import { supabaseAdmin } from './supabaseAdmin';

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  page_number: number;
  chunk_index: number;
  metadata: {
    source: string;
    page: number;
    chunk_index: number;
  };
}

export class FallbackRAGSystem {
  private isInitialized = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initializeVectorStore(_userId: string, _documentIds: string[]): Promise<void> {
    // No-op for fallback mode
    this.isInitialized = true;
  }

  async addDocumentsToVectorStore(chunks: DocumentChunk[]): Promise<void> {
    // No-op for fallback mode
    console.log(`Fallback mode: Would store ${chunks.length} chunks`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async searchRelevantChunks(_query: string, _k: number = 5): Promise<DocumentChunk[]> {
    // Simple text-based search fallback
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateAnswer(query: string, _relevantChunks: DocumentChunk[]): Promise<string> {
    // Simple fallback response
    return `I'm in fallback mode and can't process your question "${query}" right now. This is because the OpenAI API quota has been exceeded. Please check your OpenAI billing details or use a different API key.`;
  }

  async queryDocuments(query: string, userId: string, documentIds: string[]): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initializeVectorStore(userId, documentIds);
      }

      if (documentIds.length === 0) {
        return "I don't have any documents to search through. Please upload some PDFs first.";
      }

      // Very simple keyword-driven search without embeddings
      const term = query.toLowerCase().match(/[a-z0-9+#\.\-]{2,}/g)?.slice(0, 5) || [];
      if (term.length === 0) {
        return "I couldn't extract useful keywords from your question.";
      }

      const likePatterns = term.map(t => `%${t}%`);

      // Try a full-text search first; fall back to ILIKE OR chain
      let hits: { content: string; page_number: number; document_id: string }[] = [];
      const { data: ftData, error: ftErr } = await supabaseAdmin
        .from('document_chunks')
        .select('content,page_number,document_id')
        .in('document_id', documentIds)
        .textSearch('content', term.join(' & '), { type: 'websearch' })
        .limit(10);

      if (!ftErr && ftData) {
        hits = ftData as typeof hits;
      } else {
        // Fallback to ILIKE OR conditions
        let q = supabaseAdmin
          .from('document_chunks')
          .select('content,page_number,document_id')
          .in('document_id', documentIds)
          .limit(10);
        for (const p of likePatterns) {
          q = q.or(`content.ilike.${p}`);
        }
        const { data: likeData } = await q;
        if (likeData) hits = likeData as typeof hits;
      }

      if (hits.length === 0) {
        return "I couldn't find information in your PDFs matching that question.";
      }

      // Build a concise, deterministic answer
      const snippets = hits.map(h => {
        const idx = h.content.toLowerCase().indexOf(term[0]);
        const start = Math.max(0, idx - 60);
        const end = Math.min(h.content.length, (idx === -1 ? 120 : idx + 60));
        const snippet = h.content.slice(start, end).replace(/\s+/g, ' ').trim();
        return `- p.${h.page_number}: "${snippet}"`;
      });

      // Lightweight yes/no heuristic for skill presence
      const skill = term.find(t => /[a-z]+/.test(t)) || term[0];
      const affirmative = hits.some(h => h.content.toLowerCase().includes(skill));
      const header = affirmative
        ? `Yes — the PDFs mention "${skill}".`
        : `Not explicitly mentioned, but related text found for "${skill}".`;

      return `${header}\nTop matches:\n${snippets.join('\n')}`;
    } catch (error) {
      console.error('Error in fallback RAG:', error);
      return "I encountered an error while processing your question. Please try again later.";
    }
  }

  async resetVectorStore(): Promise<void> {
    this.isInitialized = false;
  }
}

export const fallbackRagSystem = new FallbackRAGSystem();
