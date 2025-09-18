import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

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
    title?: string;
    source_type?: string;
    source_url?: string;
  };
}

export class PDFProcessor {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '.', '!', '?', ';', ':', ' ', ''],
    });
  }

  async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      const pdf = await import('pdf-parse');
      const data = await pdf.default(buffer);
      return {
        text: data.text,
        pageCount: data.numpages
      };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async chunkText(
    text: string,
    documentId: string,
    pageCount: number,
    extraMeta: Partial<DocumentChunk['metadata']> = {}
  ): Promise<DocumentChunk[]> {
    try {
      const chunks = await this.textSplitter.splitText(text);
      
      return chunks.map((chunk, index) => ({
        id: `${documentId}_chunk_${index}`,
        document_id: documentId,
        content: chunk.trim(),
        page_number: Math.floor((index / chunks.length) * pageCount) + 1,
        chunk_index: index,
        metadata: {
          source: documentId,
          ...extraMeta,
          page: Math.floor((index / chunks.length) * pageCount) + 1,
          chunk_index: index,
        }
      }));
    } catch (error) {
      console.error('Error chunking text:', error);
      throw new Error('Failed to chunk text');
    }
  }

  async processPDF(
    buffer: Buffer,
    documentId: string,
    extraMeta: Partial<DocumentChunk['metadata']> = {}
  ): Promise<{
    chunks: DocumentChunk[];
    pageCount: number;
    text: string;
  }> {
    try {
      const { text, pageCount } = await this.extractTextFromPDF(buffer);
      const chunks = await this.chunkText(text, documentId, pageCount, extraMeta);
      
      return {
        chunks,
        pageCount,
        text
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw error;
    }
  }
}

export const pdfProcessor = new PDFProcessor();
