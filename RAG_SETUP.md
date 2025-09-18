# RAG Implementation Setup Guide

## Overview
This implementation adds RAG (Retrieval-Augmented Generation) functionality to your chat-pdf application using LangChain. The AI will now answer questions based only on the uploaded PDF documents.

## Features Added
- PDF text extraction and chunking
- Vector embeddings using OpenAI
- FAISS vector store for similarity search
- RAG-based question answering
- Document chunk storage in Supabase

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
1. **PDF Upload**: When a PDF is uploaded, it's processed to extract text and create chunks
2. **Chunking**: Text is split into manageable chunks with overlap for better context
3. **Embeddings**: Each chunk is converted to vector embeddings using OpenAI
4. **Storage**: Chunks and embeddings are stored in the database and FAISS vector store
5. **Querying**: When a user asks a question, relevant chunks are retrieved and used to generate an answer

## Key Files Added/Modified
- `lib/chunk.ts` - PDF processing and text chunking
- `lib/rag.ts` - RAG system with vector search and answer generation
- `app/api/upload/route.tsx` - Updated to process PDFs and create embeddings
- `app/api/chats/[id]/messages/route.tsx` - Updated to use RAG for responses
- `supabase-setup.sql` - Updated database schema

## Usage
1. Upload PDF documents to a chat
2. Wait for processing to complete (status will show "ready")
3. Ask questions about the documents
4. The AI will answer based only on the uploaded PDF content

## Error Handling
- If PDF processing fails, the document status will be set to "failed"
- If RAG processing fails, a fallback error message will be shown
- All errors are logged for debugging

## Performance Notes
- PDF processing happens during upload
- Vector store is initialized per chat session
- Chunks are stored persistently in the database
- FAISS vector store provides fast similarity search
