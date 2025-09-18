# RAG Implementation Setup Guide

## Overview
This implementation upgrades the RAG (Retrieval-Augmented Generation) experience for chat-pdf using LangChain. The assistant now reasons over multiple source types—PDFs, scraped URLs, and OCR'd screenshots—while delivering grounded answers with inline citations and graceful fallbacks.

## Features Added
- PDF, URL, and screenshot ingestion with automatic title suggestions
- Text extraction & chunking (1000 character segments) for efficient retrieval
- Vector embeddings using OpenAI (with automatic fallback to keyword search)
- Inline citations (`[n]`) plus a summarized "Sources" section in every answer
- Conversation export to PDF via jsPDF
- Document chunk storage in Supabase for persistence

## Required Environment Variables
Add these to your `.env.local` file:

```env
# OpenAI API Key (required for RAG functionality)
OPENAI_API_KEY=your_openai_api_key

# Existing variables (keep these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Setup
Run the updated `supabase-setup.sql` file in your Supabase SQL editor to create the new tables:
- `document_chunks` - stores processed PDF chunks
- `chats` - stores chat conversations (with document_ids array)
- `messages` - stores chat messages
- `chat_documents` - junction table linking chats to documents

**If you already have existing tables**, run the comprehensive fix script `fix-database-relationships.sql` to add missing columns and foreign key relationships.

**For new setups**, just run the `supabase-setup.sql` script.

## How It Works
1. **Source Upload**
   - PDFs → `pdf-parse`
   - URLs → Headless Chromium via Puppeteer + Cheerio
   - Screenshots → OpenAI Vision OCR
2. **Chunking**: Extracted text is split into overlapping 1000-character chunks.
3. **Metadata Enrichment**: AI-generated titles, source types, URLs, and page estimates are attached to each chunk.
4. **Embeddings**: Chunks are embedded with OpenAI (`text-embedding-3-small`) and stored in an in-memory vector store (FAISS if available, otherwise LangChain MemoryVectorStore).
5. **Querying**: Top-k chunks are retrieved, numbered, and passed to `gpt-4o-mini`. Responses include inline citations and a human-readable sources list. When OpenAI is unavailable, the system falls back to deterministic keyword/full-text search with summaries.

## Key Files Added/Modified
- `lib/chunk.ts` — shared chunking utilities
- `lib/sources/url.ts` — Puppeteer + Cheerio web scraping
- `lib/sources/image.ts` — OpenAI Vision OCR for screenshots
- `lib/generateTitle.ts` — AI title suggestions for uploaded sources
- `lib/rag.ts` — RAG pipeline with citation-aware prompting and metadata tracking
- `lib/rag-fallback.ts` — metadata-aware keyword/full-text fallback search
- `app/api/upload/route.ts` — multi-source ingest pipeline and vector updates
- `app/api/documents/[id]/view/route.ts` — signed URLs + preview snippets per source type
- `components/SourceUploader.tsx` and `components/DocumentViewer.tsx` — front-end source management
- `components/ExportConversationButton.tsx` — conversation PDF export
- `supabase-setup.sql` — `documents` table now includes `source_type`, `source_url`, and JSON metadata

## Usage
1. Upload one or more sources (PDFs, URLs, screenshots) to a chat.
2. Wait for processing to complete (status = `ready`).
3. Ask questions—responses cite the exact source passages used.
4. Export the conversation as a PDF if needed.

## Error Handling
- Upload failures mark the source as `failed` and preserve error details.
- Screenshot OCR requires `OPENAI_API_KEY`; without it, uploads are rejected.
- If embeddings fail because of quota or FAISS issues, the system falls back to keyword/full-text retrieval.
- All significant issues are logged server-side for debugging.

## Performance Notes
- Source processing happens during upload; URLs use headless Chromium (ensure the host supports Puppeteer).
- Vector store state is cached per server instance; `resetVectorStore()` clears it when needed.
- Chunks live in Postgres for durability, while embeddings stay in-process for speed.
- Citations are computed from chunk metadata, so document titles and URLs are surfaced automatically.
