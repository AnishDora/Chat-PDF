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

  private stopwords = new Set([
    'the','a','an','and','or','but','if','then','else','of','to','in','on','for','with','as','by','at','from','is','are','was','were','be','been','this','that','it','its','your','you','we','our','their','they','he','she','his','her','them','i'
  ]);

  private normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9+#\.\-\s]/g, ' ');
  }

  private async fetchAllText(documentIds: string[]): Promise<string> {
    const { data } = await supabaseAdmin
      .from('document_chunks')
      .select('content')
      .in('document_id', documentIds)
      .limit(500);
    const all = (data || []).map((r: { content: string }) => r.content).join('\n');
    return all;
  }

  private summarize(text: string, maxSentences = 3): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const sentences = cleaned.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).slice(0, 100);
    if (sentences.length <= maxSentences) return cleaned.slice(0, 800);

    // Word frequency
    const freq: Record<string, number> = {};
    for (const w of this.normalize(text).split(/\s+/)) {
      if (!w || this.stopwords.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
    // Score sentences
    const scored = sentences.map((s, i) => {
      const words = this.normalize(s).split(/\s+/);
      const score = words.reduce((acc, w) => acc + (freq[w] || 0), 0) / Math.sqrt(words.length + 1);
      // slight positional boost to earlier sentences (common for resumes/PDs)
      const posBoost = 1 + (sentences.length - i) * 0.001;
      return { s, i, score: score * posBoost };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, maxSentences).sort((a, b) => a.i - b.i).map(x => x.s.trim());
    return top.join(' ');
  }

  private canonicalizeSkill(skill: string): string {
    const s = skill.toLowerCase().trim();
    const map: Record<string, string> = {
      'js': 'javascript',
      'node': 'node.js',
      'c#': 'csharp',
      'c sharp': 'csharp',
      'c++': 'cpp',
      'golang': 'go',
      'ts': 'typescript',
      'py': 'python',
      'reactjs': 'react',
      'nextjs': 'next.js',
    };
    return map[s] || s;
  }

  private buildSkillPatterns(skill: string): string[] {
    const s = this.canonicalizeSkill(skill);
    const patterns = new Set<string>([s]);
    // Expand some common variants
    if (s === 'javascript') patterns.add('js').add('javascript');
    if (s === 'typescript') patterns.add('ts');
    if (s === 'python') patterns.add('py').add('python');
    if (s === 'csharp') patterns.add('c#').add('c sharp');
    if (s === 'cpp') patterns.add('c++');
    if (s === 'go') patterns.add('golang');
    if (s === 'node.js') patterns.add('node').add('nodejs');
    if (s === 'next.js') patterns.add('nextjs');
    return Array.from(patterns);
  }

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

      const ql = query.toLowerCase();
      // 1) Summarization-style questions
      if (/\b(what is (this|the) (pdf|document)|summary|summarize|overview|about)\b/.test(ql)) {
        const text = await this.fetchAllText(documentIds);
        if (!text) return "I couldn't read any content from your PDFs yet.";
        const summary = this.summarize(text, 3);
        return `Summary: ${summary}`;
      }

      // 2) Skill presence questions (e.g., "does the candidate know php")
      const skillMatch = ql.match(/\b(know|proficient|experience|skilled|familiar)\b.*?\b([a-z0-9+#\.\-]{2,})\b/) ||
                         ql.match(/\bdoes (the )?candidate\b.*?\b([a-z0-9+#\.\-]{2,})\b/);
      if (skillMatch) {
        const skill = skillMatch[2];
        const variants = this.buildSkillPatterns(skill);
        const likePatterns = variants.map(v => `%${v}%`);
        const { data } = await supabaseAdmin
          .from('document_chunks')
          .select('content,page_number,document_id')
          .in('document_id', documentIds)
          .or(likePatterns.map(p => `content.ilike.${p}`).join(','))
          .limit(10);
        const hits = (data || []) as { content: string; page_number: number; document_id: string }[];
        if (hits.length === 0) {
          return `I couldn't find any mention of "${skill}" in the PDFs.`;
        }
        const affirmative = hits.some(h => variants.some(v => h.content.toLowerCase().includes(v)));
        const snippets = hits.map(h => {
          const idx = Math.max(...variants.map(v => h.content.toLowerCase().indexOf(v)));
          const start = Math.max(0, (idx === -1 ? 0 : idx) - 60);
          const end = Math.min(h.content.length, (idx === -1 ? 120 : idx + 60));
          return `- p.${h.page_number}: "${h.content.slice(start, end).replace(/\s+/g, ' ').trim()}"`;
        });
        return `${affirmative ? 'Yes' : 'Not explicitly mentioned'} — looking for "${skill}".\nTop matches:\n${snippets.join('\n')}`;
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
        const { data: likeData } = await supabaseAdmin
          .from('document_chunks')
          .select('content,page_number,document_id')
          .in('document_id', documentIds)
          .or(likePatterns.map(p => `content.ilike.${p}`).join(','))
          .limit(10);
        if (likeData) hits = likeData as typeof hits;
      }

      if (hits.length === 0) {
        // As a fallback, return a brief general summary to provide context
        const text = await this.fetchAllText(documentIds);
        if (!text) return "I couldn't find relevant information or read the PDFs.";
        const summary = this.summarize(text, 2);
        return `I couldn't find an exact match. Here's a brief summary instead: ${summary}`;
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
