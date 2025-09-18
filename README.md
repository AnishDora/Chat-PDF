Chat-PDF is a Next.js app that lets you upload PDFs, store and index their content, and chat with context grounded strictly in your documents. It uses Supabase for storage and database, Clerk for auth (optional), and a Retrieval-Augmented Generation (RAG) layer that works both with OpenAI and in a local fallback mode (no external AI required).

Features
- Upload multiple PDFs; store in Supabase Storage
- Extract text and chunk content server-side
- Ask questions; answers are grounded in your PDFs
- Works without OpenAI (keyword/full‑text fallback with summaries and snippets)
- Clean, modern UI with a PDF viewer and chat

Tech Stack
- Next.js App Router (Node.js runtime routes)
- Supabase: Auth (optional), Postgres, Storage
- Clerk (optional): authentication
- LangChain: text splitting; OpenAI chat + embeddings (when available)
- Fallback retrieval: Supabase SQL full‑text/ILIKE search with heuristic summaries

Repository Layout (selected)
- `app/api/*` — API routes (upload, chats, messages, documents)
- `components/*` — UI components (chat, PDF viewer, uploader)
- `lib/rag.ts` — RAG with OpenAI + in‑process vector store fallback
- `lib/rag-fallback.ts` — No‑OpenAI fallback: keyword/full‑text search + summaries
- `lib/chunk.ts` — PDF text extraction and chunking
- `supabase-setup.sql` — DB schema and storage policies

Data Model (core tables)
- `documents` — uploaded PDFs and processing status
- `document_chunks` — per‑document text chunks for retrieval
- `chats` — chat sessions
- `messages` — messages per chat
- Storage bucket `pdfs` — raw PDF files

Prerequisites
- Node.js 18+
- A Supabase project
- (Optional, recommended) OpenAI API key for semantic answers
- (Optional) Clerk for auth, or replace with your own auth in routes

Environment Variables
Create `.env.local` (see `.env.local.example`):
- `OPENAI_API_KEY` (optional) — enables semantic embeddings and AI answers
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role for server routes
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (optional)

Quick Start
1) Install deps
   npm install

2) Create schema in Supabase
   - Open the SQL editor and run `supabase-setup.sql`

3) Configure env
   - Copy `.env.local.example` to `.env.local` and fill in values
   - Validate envs:
     npm run check-env
   - Optional helper to create `.env.local` from a key:
     OPENAI_API_KEY=sk-... node setup-api-key.js
     # or
     node setup-api-key.js sk-...

4) Run the dev server
   npm run dev
   Open http://localhost:3000

Using the App
- Click “Add Documents” to upload PDF(s)
- After processing, open a chat and ask questions
- Answers cite your documents; for simple “does it mention X?” questions, the fallback shows page snippets and a yes/no

RAG Behavior
- With OpenAI: Uses `gpt-4o-mini` and `text-embedding-3-small` via LangChain
  - In‑process vector store backed by memory; avoids native FAISS issues
  - Per‑process cache initialized on first use
- Without OpenAI or on errors: Falls back to `lib/rag-fallback.ts`
  - Keyword/full‑text search in `document_chunks`
  - Heuristic summaries for “what is this PDF about?”
  - Alias-aware skill checks (e.g., c#/c sharp, js/javascript, node/node.js)

API Routes (high level)
- `POST /api/upload` — Upload one or more PDFs, extract text, store chunks
- `GET /api/documents` — List documents
- `GET /api/documents/:id/view` — Signed URL to view a PDF
- `GET /api/chats` — List chats
- `POST /api/chats` — Create a chat
- `GET /api/chats/:id/messages` — List chat messages
- `POST /api/chats/:id/messages` — Add a user message and generate an answer

Performance Tips
- Co‑locate Supabase and your hosting region to reduce RTT
- Enable OpenAI for semantic retrieval and faster, streamed answers (if you add streaming)
- Consider pgvector in Supabase for large corpora and SQL‑level vector search
- Cache per‑chat vector stores if using in‑process retrieval

Security & Secrets
- Do not commit real API keys. `.env*` is git‑ignored
- Use `.env.local.example` to document required variables
- `setup-api-key.js` never hardcodes secrets; it reads from env/CLI

Troubleshooting
- “I uploaded a file but answers say ‘no documents’”
  - Confirm your file is a PDF; non‑PDFs are rejected
  - Check `documents` status is `ready` and rows exist in `document_chunks`
- “Slow replies”
  - Check region latency and network; consider enabling OpenAI and streaming
  - Fallback mode performs DB searches; semantic embeddings are faster at retrieval
- “OpenAI quota or missing key”
  - App automatically falls back to keyword/full‑text search with summaries

Extending
- Add DOCX support (e.g., mammoth) in `lib/chunk.ts`
- Add pgvector and migrate to SQL vector search
- Add streaming responses to reduce perceived latency
- Add persistent skill extraction at upload time for structured Q&A

Scripts
- `npm run dev` — start dev server
- `npm run build` — build (Next.js)
- `npm run lint` — ESLint
- `npm run check-env` — validate required environment variables

Notes
- Native FAISS dependency was removed to avoid runtime issues; an in‑process memory vector store and a robust fallback path are provided by default.
