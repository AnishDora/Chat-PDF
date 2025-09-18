import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { supabaseAdmin } from './supabaseAdmin';
import { DocumentChunk } from './chunk';
import { fallbackRagSystem } from './rag-fallback';
import { SOURCE_TYPE_LABELS, SourceType } from './sourceTypes';

// Dynamic imports for vector stores to avoid native dependency crashes in serverless
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FaissStore: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MemoryVectorStore: any = null;

interface DocumentMetadataEntry {
  title?: string;
  source_type?: SourceType | string;
  source_url?: string | null;
}

export class RAGSystem {
  private openai: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private vectorStore: any = null;
  private isInitialized = false;
  private hasKey = Boolean(process.env.OPENAI_API_KEY);
  private documentMetadata = new Map<string, DocumentMetadataEntry>();

  constructor() {
    // Initialize clients only if key exists
    this.openai = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    });
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    });
  }

  private mergeDocumentMetadata(documentId: string, metadata: DocumentMetadataEntry): void {
    const existing = this.documentMetadata.get(documentId) ?? {};
    this.documentMetadata.set(documentId, {
      title: metadata.title ?? existing.title,
      source_type: metadata.source_type ?? existing.source_type,
      source_url: metadata.source_url ?? existing.source_url,
    });
  }

  private getDocumentMetadata(documentId: string): DocumentMetadataEntry {
    return this.documentMetadata.get(documentId) ?? {};
  }

  private resolveSourceTypeLabel(type?: string | null): string {
    if (!type) return 'Document';
    const labels = SOURCE_TYPE_LABELS as Record<string, string>;
    if (labels[type]) {
      return labels[type];
    }
    return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async initializeFaiss(): Promise<any> {
    if (FaissStore) return FaissStore;
    try {
      const { FaissStore: FaissStoreClass } = await import('@langchain/community/vectorstores/faiss');
      FaissStore = FaissStoreClass;
      return FaissStore;
    } catch {
      // Don't throw; we will fallback to memory vector store
      console.warn('FAISS not available, will fallback to MemoryVectorStore');
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async initializeMemoryStore(): Promise<any> {
    if (MemoryVectorStore) return MemoryVectorStore;
    const { MemoryVectorStore: MemoryStoreClass } = await import('langchain/vectorstores/memory');
    MemoryVectorStore = MemoryStoreClass;
    return MemoryVectorStore;
  }

  async initializeVectorStore(userId: string, documentIds: string[]): Promise<void> {
    try {
      if (!this.hasKey) {
        // No embeddings possible without key; mark as initialized with no vector store
        this.vectorStore = null;
        this.isInitialized = true;
        return;
      }
      // Get all chunks for the user's documents
      const { data: chunks, error } = await supabaseAdmin
        .from('document_chunks')
        .select('*')
        .in('document_id', documentIds)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch chunks: ${error.message}`);
      }

      if (!chunks || chunks.length === 0) {
        this.vectorStore = null;
        this.isInitialized = true;
        return;
      }

      const { data: docRecords, error: docMetaError } = await supabaseAdmin
        .from('documents')
        .select('id,title,source_type,source_url')
        .in('id', documentIds)
        .eq('user_id', userId);

      if (docMetaError) {
        throw new Error(`Failed to fetch document metadata: ${docMetaError.message}`);
      }

      const docMetaMap = new Map<string, DocumentMetadataEntry>();
      (docRecords || []).forEach((doc: { id: string; title: string | null; source_type: string | null; source_url: string | null }) => {
        const meta: DocumentMetadataEntry = {
          title: doc.title ?? undefined,
          source_type: doc.source_type ?? undefined,
          source_url: doc.source_url ?? undefined,
        };
        docMetaMap.set(doc.id, meta);
        this.mergeDocumentMetadata(doc.id, meta);
      });

      // Convert chunks to LangChain documents
      const documents = chunks.map((chunk: { content: string; id: string; document_id: string; page_number: number; chunk_index: number }) => {
        const storedMeta = docMetaMap.get(chunk.document_id) ?? this.getDocumentMetadata(chunk.document_id);
        return new Document({
          pageContent: chunk.content,
          metadata: {
            id: chunk.id,
            document_id: chunk.document_id,
            page_number: chunk.page_number,
            page: chunk.page_number,
            chunk_index: chunk.chunk_index,
            source: chunk.document_id,
            title: storedMeta.title,
            source_type: storedMeta.source_type,
            source_url: storedMeta.source_url,
          }
        });
      });

      // Create embeddings and vector store
      const FaissStoreClass = await this.initializeFaiss();
      if (FaissStoreClass) {
        try {
          this.vectorStore = await FaissStoreClass.fromDocuments(documents, this.embeddings);
        } catch (e) {
          console.warn('FAISS failed at runtime, falling back to MemoryVectorStore:', e);
        }
      }

      if (!this.vectorStore) {
        const MemoryStoreClass = await this.initializeMemoryStore();
        this.vectorStore = await MemoryStoreClass.fromDocuments(documents, this.embeddings);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw error;
    }
  }

  async addDocumentsToVectorStore(chunks: DocumentChunk[]): Promise<void> {
    try {
      if (!this.hasKey) {
        // Without key, skip vector ops; rely on fallback at query time
        return;
      }
      chunks.forEach(chunk => {
        const meta = chunk.metadata ?? { source: chunk.document_id };
        this.mergeDocumentMetadata(chunk.document_id, {
          title: meta.title ?? undefined,
          source_type: meta.source_type ?? undefined,
          source_url: meta.source_url ?? undefined,
        });
      });
      const documents = chunks.map(chunk => {
        const stored = this.getDocumentMetadata(chunk.document_id);
        return new Document({
          pageContent: chunk.content,
          metadata: {
            id: chunk.id,
            document_id: chunk.document_id,
            page_number: chunk.page_number,
            page: chunk.page_number,
            chunk_index: chunk.chunk_index,
            source: chunk.document_id,
            title: stored.title,
            source_type: stored.source_type,
            source_url: stored.source_url,
          }
        });
      });

      if (this.vectorStore?.addDocuments) {
        // Add to existing vector store
        await this.vectorStore.addDocuments(documents);
      } else {
        // Create new vector store with best available backend
        const FaissStoreClass = await this.initializeFaiss();
        if (FaissStoreClass) {
          try {
            this.vectorStore = await FaissStoreClass.fromDocuments(documents, this.embeddings);
          } catch (e) {
            console.warn('FAISS failed at runtime, falling back to MemoryVectorStore:', e);
          }
        }
        if (!this.vectorStore) {
          const MemoryStoreClass = await this.initializeMemoryStore();
          this.vectorStore = await MemoryStoreClass.fromDocuments(documents, this.embeddings);
        }
      }
    } catch (error) {
      console.error('Error adding documents to vector store:', error);
      
      // Check if it's a quota error
      if (error instanceof Error && error.message.includes('quota')) {
        console.log('OpenAI quota exceeded, switching to fallback mode');
        await fallbackRagSystem.addDocumentsToVectorStore(chunks);
        return;
      }
      
      // Check if it's a FAISS import error
      if (error instanceof Error && (error.message.includes('faiss-node') || error.message.includes('FAISS'))) {
        console.log('FAISS not available, switching to fallback mode');
        await fallbackRagSystem.addDocumentsToVectorStore(chunks);
        return;
      }
      
      throw error;
    }
  }

  async searchRelevantChunks(query: string, k: number = 5): Promise<Document[]> {
    if (!this.vectorStore || !this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, k);
      return results;
    } catch (error) {
      console.error('Error searching relevant chunks:', error);
      throw error;
    }
  }

  async generateAnswer(query: string, relevantChunks: Document[]): Promise<string> {
    try {
      const contextEntries = relevantChunks.map((chunk, index) => {
        const meta = (chunk.metadata ?? {}) as Record<string, unknown>;
        const docId = (meta.document_id as string) || (meta.source as string) || `document-${index + 1}`;
        const storedMeta = this.getDocumentMetadata(docId);
        const title = (meta.title as string) || storedMeta.title || `Document ${docId}`;
        const rawSourceType = (meta.source_type as string) || (storedMeta.source_type as string) || undefined;
        const sourceTypeLabel = this.resolveSourceTypeLabel(rawSourceType ?? undefined);
        const pageNumber = Number(meta.page_number ?? meta.page ?? 1) || 1;
        const sourceUrl = (meta.source_url as string) || (storedMeta.source_url as string) || null;

        return {
          header: `[${index + 1}] ${title} (${sourceTypeLabel}${sourceUrl ? ` - ${sourceUrl}` : ''}) — Page ${pageNumber}`,
          content: chunk.pageContent,
          title,
          sourceType: rawSourceType,
          page: pageNumber,
          sourceUrl,
        };
      });

      const context = contextEntries
        .map(entry => `${entry.header}\n${entry.content}`)
        .join('\n\n');

      const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful assistant that answers questions using the numbered source excerpts below.
Use only those excerpts to construct a clear and direct response.
If the answer cannot be found in the excerpts, respond with "I cannot find the answer to your question in the provided sources."
Do not include citations, reference markers, or a source list in your response.

Source excerpts:
{context}

Question: {question}

Answer:`);

      const chain = RunnableSequence.from([
        promptTemplate,
        this.openai,
        new StringOutputParser(),
      ]);

      const answer = await chain.invoke({
        context,
        question: query,
      });

      const trimmedAnswer = typeof answer === 'string' ? answer.trim() : '';

      return trimmedAnswer;
    } catch (error) {
      console.error('Error generating answer:', error);
      throw error;
    }
  }

  async queryDocuments(query: string, userId: string, documentIds: string[]): Promise<string> {
    try {
      if (!this.hasKey) {
        return await fallbackRagSystem.queryDocuments(query, userId, documentIds);
      }
      // Initialize vector store if not already done
      if (!this.isInitialized) {
        await this.initializeVectorStore(userId, documentIds);
      }

      if (!this.vectorStore) {
        return "I don't have any sources to search through. Please upload documents, URLs, or screenshots first.";
      }

      // Search for relevant chunks
      const relevantChunks = await this.searchRelevantChunks(query, 5);
      
      if (relevantChunks.length === 0) {
        return "I couldn't find any relevant information in your sources to answer that question.";
      }

      // Generate answer
      const answer = await this.generateAnswer(query, relevantChunks);
      return answer;
    } catch (error) {
      console.error('Error querying documents:', error);
      
      // Check if it's a quota error and use fallback
      if (error instanceof Error && error.message.includes('quota')) {
        console.log('OpenAI quota exceeded, using fallback RAG system');
        return await fallbackRagSystem.queryDocuments(query, userId, documentIds);
      }
      
      // Check if it's a FAISS error and use fallback
      if (error instanceof Error && (error.message.includes('faiss-node') || error.message.includes('FAISS'))) {
        console.log('FAISS not available, using fallback RAG system');
        return await fallbackRagSystem.queryDocuments(query, userId, documentIds);
      }
      
      return "I encountered an error while processing your question. Please try again.";
    }
  }

  async resetVectorStore(): Promise<void> {
    this.vectorStore = null;
    this.isInitialized = false;
    this.documentMetadata.clear();
  }
}

export const ragSystem = new RAGSystem();
