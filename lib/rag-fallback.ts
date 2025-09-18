// Fallback RAG system that works without OpenAI API calls
// Use this when you don't have OpenAI API access or have exceeded quota

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

      // Enhanced fallback response with more helpful information
      return `I can see you have ${documentIds.length} document(s) uploaded to this chat, but I'm currently in fallback mode due to API limitations. 

Your question: "${query}"

To get AI-powered answers based on your PDFs, please:
1. Check your OpenAI billing: https://platform.openai.com/account/billing
2. Ensure you have sufficient API credits
3. Try again once the API is available

The documents are safely stored and will be processed once the API is restored.`;
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
