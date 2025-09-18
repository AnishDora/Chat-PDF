# Chat-PDF

Chat-PDF is a **Next.js** web app that lets you upload, index, and chat
with your own PDFs. It features a clean, modern UI with an integrated
PDF viewer and supports both AI-powered and local fallback retrieval
modes.

------------------------------------------------------------------------

## ✨ Features

-   **Multiple PDF Uploads:** Store files in Supabase Storage.
-   **Server-Side Text Extraction & Chunking:** Automatically processes
    PDFs.
-   **Context-Grounded Chat:** Ask questions and get answers strictly
    from your PDFs.
-   **AI or Fallback Mode:** Uses OpenAI + embeddings when available,
    otherwise falls back to keyword/full-text search with summaries.
-   **Modern UI:** Smooth, chat-style interface with inline PDF viewing.

------------------------------------------------------------------------

## 🛠 Tech Stack

-   **Framework:** Next.js App Router (Node.js runtime routes)
-   **Database & Storage:** Supabase (Postgres, Storage, Auth optional)
-   **Auth (Optional):** Clerk, or bring your own
-   **RAG Layer:** LangChain (OpenAI chat + embeddings) + local
    in-memory vector store fallback
-   **Fallback Retrieval:** Supabase SQL full‑text/ILIKE search +
    heuristic summaries

------------------------------------------------------------------------

## 📂 Repository Layout (Highlights)

-   `app/api/*` --- API routes for uploads, chats, messages, documents
-   `components/*` --- UI components (chat, PDF viewer, uploader)
-   `lib/rag.ts` --- RAG pipeline with OpenAI + vector store fallback
-   `lib/rag-fallback.ts` --- Keyword/full-text fallback search with
    summaries
-   `lib/chunk.ts` --- PDF text extraction + chunking logic
-   `supabase-setup.sql` --- Database schema & storage policies

------------------------------------------------------------------------

## 🗄 Data Model

  Table                                            Purpose
  ------------------------------------------------ --------------------------------------------
  `documents`                                      Stores uploaded PDFs and processing status
  `document_chunks`                                Individual text chunks for retrieval
  `chats`                                          Chat sessions
  `messages`                                       Messages within a chat
  **Storage:** `pdfs` bucket holds raw PDF files   

------------------------------------------------------------------------

## 🚀 Quick Start

1.  **Install dependencies:**

    ``` bash
    npm install
    ```

2.  **Create schema in Supabase:**

    -   Open SQL editor, run `supabase-setup.sql`

3.  **Configure environment:**

    -   Copy `.env.local.example` → `.env.local`
    -   Fill in:
        -   `NEXT_PUBLIC_SUPABASE_URL`
        -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        -   `SUPABASE_SERVICE_ROLE_KEY`
        -   `OPENAI_API_KEY` *(optional)*
        -   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
            *(optional)*
    -   Double-check values are correct before running the app

4.  **Run dev server:**

    ``` bash
    npm run dev
    ```

    Open <http://localhost:3000>

------------------------------------------------------------------------

## 💬 Using the App

-   Click **"Add Documents"** to upload PDFs.
-   After processing, open a chat and ask questions.
-   Answers include page references or snippets from your documents.
-   Works offline in fallback mode (no external AI required).

------------------------------------------------------------------------

## 🧠 RAG Behavior

-   **With OpenAI:** Uses `gpt-4o-mini` + `text-embedding-3-small` via
    LangChain.
    -   In‑process memory vector store avoids FAISS issues.
-   **Without OpenAI:** Falls back to `rag-fallback.ts`
    -   Keyword + full-text search in `document_chunks`
    -   Heuristic summaries & alias-aware search (e.g. c#/c-sharp,
        js/javascript)

------------------------------------------------------------------------

## ⚡ Performance Tips

-   Host Supabase & app in the same region to reduce latency.
-   Use OpenAI for faster, higher-quality answers (with streaming if
    possible).
-   Consider `pgvector` in Supabase for large document corpora.

------------------------------------------------------------------------

## 🔐 Security & Secrets

-   Never commit real API keys. `.env*` is git-ignored.
-   Use `.env.local.example` to document required env vars.
  

------------------------------------------------------------------------

## 🛠 Troubleshooting

-   **No answers returned:** Verify PDF upload status is `ready` and
    chunks exist.
-   **Slow replies:** Check hosting region + consider enabling OpenAI.
-   **No OpenAI key:** App auto-falls back to keyword/full-text
    retrieval.

------------------------------------------------------------------------

## 🧩 Extending

-   Add DOCX support (e.g. `mammoth`) in `lib/chunk.ts`
-   Add `pgvector` for SQL-level semantic search
-   Add streaming responses for lower latency
-   Extract skills/entities at upload for structured Q&A

------------------------------------------------------------------------

## 📜 Scripts

``` bash
npm run dev        # start dev server
npm run build      # production build
npm run lint       # lint code
```

------------------------------------------------------------------------

## 📝 Notes

Native FAISS dependency was removed to avoid runtime issues --- replaced
with in‑process memory vector store + robust fallback search.

--------------------------------------------------------------------------

<img width="1470" height="803" alt="Screenshot 2025-09-17 at 22 29 21" src="https://github.com/user-attachments/assets/02044c2b-a777-4bb2-a8d2-771547237200" />
<img width="1470" height="803" alt="Screenshot 2025-09-17 at 22 29 39" src="https://github.com/user-attachments/assets/cde556d6-aba7-4936-b66e-22332e272da0" />
<img width="1470" height="803" alt="Screenshot 2025-09-17 at 22 29 08" src="https://github.com/user-attachments/assets/4b91285a-4af3-4dae-b2d1-f6ca057370cb" />
<img width="1470" height="803" alt="Screenshot 2025-09-17 at 22 28 42" src="https://github.com/user-attachments/assets/b2aff095-e81f-4c2b-b653-438aa94bb5b0" />
