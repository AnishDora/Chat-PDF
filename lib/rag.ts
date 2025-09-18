import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { supabaseAdmin } from './supabaseAdmin';
import { DocumentChunk } from './chunk';
import { fallbackRagSystem } from './rag-fallback';

// Dynamic imports for vector stores to avoid native dependency crashes in serverless
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FaissStore: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MemoryVectorStore: any = null;

export class RAGSystem {
  private openai: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private vectorStore: any = null;
  private isInitialized = false;

  constructor() {
    this.openai = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    });
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    });
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

      // Convert chunks to LangChain documents
      const documents = chunks.map((chunk: { content: string; id: string; document_id: string; page_number: number; chunk_index: number }) => new Document({
        pageContent: chunk.content,
        metadata: {
          id: chunk.id,
          document_id: chunk.document_id,
          page_number: chunk.page_number,
          chunk_index: chunk.chunk_index,
          source: chunk.document_id,
        }
      }));

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
      const documents = chunks.map(chunk => new Document({
        pageContent: chunk.content,
        metadata: {
          id: chunk.id,
          document_id: chunk.document_id,
          page_number: chunk.page_number,
          chunk_index: chunk.chunk_index,
          source: chunk.document_id,
        }
      }));

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
      // Create context from relevant chunks
      const context = relevantChunks
        .map(chunk => `Page ${chunk.metadata.page_number}: ${chunk.pageContent}`)
        .join('\n\n');

      // Create prompt template
      const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful assistant that answers questions based on the provided PDF documents. 
Use only the information from the documents below to answer the user's question.
If the answer cannot be found in the documents, say "I cannot find the answer to your question in the provided documents."

Context from documents:
{context}

Question: {question}

Answer based on the documents:`);

      // Create the chain
      const chain = RunnableSequence.from([
        promptTemplate,
        this.openai,
        new StringOutputParser(),
      ]);

      // Generate answer
      const answer = await chain.invoke({
        context,
        question: query,
      });

      return answer;
    } catch (error) {
      console.error('Error generating answer:', error);
      throw error;
    }
  }

  async queryDocuments(query: string, userId: string, documentIds: string[]): Promise<string> {
    try {
      // Initialize vector store if not already done
      if (!this.isInitialized) {
        await this.initializeVectorStore(userId, documentIds);
      }

      if (!this.vectorStore) {
        return "I don't have any documents to search through. Please upload some PDFs first.";
      }

      // Search for relevant chunks
      const relevantChunks = await this.searchRelevantChunks(query, 5);
      
      if (relevantChunks.length === 0) {
        return "I couldn't find any relevant information in the documents to answer your question.";
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
  }
}

export const ragSystem = new RAGSystem();
