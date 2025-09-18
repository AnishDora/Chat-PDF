# Chat-PDF

Chat-PDF is a **Next.js** knowledge assistant that lets you upload,
index, and chat with your own sources. Bring PDFs, scraped URLs, and OCR'd
screenshots into a single workspace, then ask grounded questions with
clear, source-aware answers, one-click exports, and graceful fallbacks
when external AI isn't available.

------------------------------------------------------------------------

## ✨ Features

-   **Upload Any Source:** PDFs (pdf-parse), web pages (Puppeteer + Cheerio),
    and screenshots (OpenAI Vision OCR) become searchable instantly.
-   **Smart Chunking (1000 chars):** Unlimited sources, token-efficient
    retrieval, automatic AI-generated titles, and Supabase-backed storage.
-   **Grounded Answers Without Citation Noise:** Responses summarize the
    retrieved passages directly, leaning on metadata (title, type, URL)
    without appending citation markers or footers.
-   **One-Click PDF Exports:** Share conversations with polished, timestamped
    transcripts using jsPDF.
-   **Graceful Fallback:** When embeddings or OpenAI quota are unavailable,
    the app switches to deterministic keyword + full-text search with
    contextual summaries.
-   **Modern UI:** Source-aware viewer (PDF iframe, web snippets, OCR preview)
    alongside a chat-first interface with automatic chat renaming.

------------------------------------------------------------------------

## 🛠 Tech Stack

-   **Framework:** Next.js App Router (Node.js runtime routes)
-   **Database & Storage:** Supabase (Postgres, Storage, Auth optional)
-   **Auth (Optional):** Clerk, or bring your own
-   **Ingestion:** `pdf-parse`, `puppeteer`, `cheerio`, and OpenAI Vision OCR
-   **RAG Layer:** LangChain (OpenAI chat + embeddings) + local
    in-memory vector store fallback
-   **Fallback Retrieval:** Supabase SQL full‑text/ILIKE search +
    heuristic summaries
-   **Exports:** jsPDF client-side PDF generation

------------------------------------------------------------------------

## 📂 Repository Layout (Highlights)

-   `app/api/*` --- API routes for uploads, chats, messages, documents
-   `components/*` --- UI components (chat, source viewer, uploader, export)
-   `lib/rag.ts` --- RAG pipeline with OpenAI + vector store fallback
-   `lib/rag-fallback.ts` --- Keyword/full-text fallback search with
    summaries
-   `lib/chunk.ts` --- PDF text extraction + chunking logic
-   `supabase-setup.sql` --- Database schema & storage policies

------------------------------------------------------------------------

## 🗄 Data Model

  Table                                            Purpose
  ------------------------------------------------ --------------------------------------------
  `documents`                                      Stores uploaded sources, type, metadata, status
  `document_chunks`                                Individual text chunks for retrieval
  `chats`                                          Chat sessions
  `messages`                                       Messages within a chat
  **Storage:** `pdfs` bucket holds raw uploads (PDFs + screenshots)

------------------------------------------------------------------------

## 🚀 Quick Start

1.  **Install dependencies:**

    ``` bash
    npm install
    ```

2.  **Create schema in Supabase:**

    -   Open SQL editor, run `supabase-setup.sql`

3.  **Configure environment:**

    -   Create a `.env.local` file and set:
        -   `NEXT_PUBLIC_SUPABASE_URL`
        -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        -   `SUPABASE_SERVICE_ROLE_KEY`
        -   `OPENAI_API_KEY` *(required for embeddings + screenshot OCR)*
        -   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
            *(optional)*
    -   Double-check values are correct before running the app

    > ℹ️  Puppeteer downloads Chromium on install. In restricted
    > environments you may need to set `PUPPETEER_EXECUTABLE_PATH` to an
    > existing Chrome/Chromium binary.

4.  **Run dev server:**

    ``` bash
    npm run dev
    ```

    Open <http://localhost:3000>

------------------------------------------------------------------------

## 💬 Using the App

-   Click **"Add Sources"** to upload PDFs, scrape URLs, or OCR screenshots.
-   The right panel shows a type-aware preview (PDF iframe, web snippet, OCR text).
-   Ask questions once sources are ready; responses summarize what was
    retrieved without bracketed citation markers or a trailing "Sources"
    block.
-   Export any conversation with **Export PDF**.
-   No OpenAI key? The app falls back to deterministic keyword/full-text
    search and concise summaries.

------------------------------------------------------------------------

## 🧠 RAG Behavior

-   **With OpenAI:** Uses `gpt-4o-mini` + `text-embedding-3-small` via
    LangChain. Context passages (with metadata like title, source type,
    and URL) are injected into the prompt, but responses stay citation-free
    for readability.
    -   In-process memory vector store avoids FAISS native builds.
    -   Screenshot OCR also relies on the OpenAI Vision API (same key).
-   **Without OpenAI:** Falls back to `rag-fallback.ts`.
    -   Keyword + full-text search in `document_chunks` with typed
        source labels and per-document metadata.
    -   Heuristic summaries & alias-aware search (e.g. c#/c-sharp,
      js/javascript) keep responses helpful.

------------------------------------------------------------------------

## ⚡ Performance Tips

-   Host Supabase & app in the same region to reduce latency.
-   Use OpenAI for faster, higher-quality answers (with streaming if
    possible).
-   Consider `pgvector` in Supabase for large document corpora.

------------------------------------------------------------------------

## 🔐 Security & Secrets

-   Never commit real API keys. `.env*` is git-ignored.
-   Required env vars are documented here; do not commit `.env*` files.
  

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
<img width="1470" height="797" alt="Screenshot 2025-09-18 at 00 13 02" src="https://github.com/user-attachments/assets/a584e88e-d0b8-4202-a3e3-c4ed6cf0536a" />
<img width="1470" height="799" alt="Screenshot 2025-09-18 at 00 13 14" src="https://github.com/user-attachments/assets/8896c850-fc9b-4979-b017-db333f2a7a4b" />
<img width="1470" height="803" alt="Screenshot 2025-09-17 at 22 28 42" src="https://github.com/user-attachments/assets/b2aff095-e81f-4c2b-b653-438aa94bb5b0" />
