-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat-pdf.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, -- Clerk user id string
  title text NOT NULL, -- a nice name, usually file name without .pdf
  storage_path text NOT NULL, -- where the file is stored in Supabase Storage
  bytes bigint, -- file size (optional)
  page_count int, -- we'll fill this later during ingest (optional)
  status text DEFAULT 'processing', -- 'processing' | 'ready' | 'failed'
  created_at timestamptz DEFAULT now()
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to only see their own documents
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid()::text = user_id);

-- Create RLS policy to allow users to insert their own documents
CREATE POLICY "Users can insert their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policy to allow users to update their own documents
CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Create RLS policy to allow users to delete their own documents
CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create storage bucket for PDFs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow users to upload their own PDFs
CREATE POLICY "Users can upload their own PDFs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pdfs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policy to allow users to view their own PDFs
CREATE POLICY "Users can view their own PDFs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pdfs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policy to allow users to delete their own PDFs
CREATE POLICY "Users can delete their own PDFs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pdfs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- Create document_chunks table for storing processed PDF chunks
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id text PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  content text NOT NULL,
  page_number integer NOT NULL,
  chunk_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_content ON public.document_chunks USING gin(to_tsvector('english', content));

-- Enable RLS for document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_chunks
CREATE POLICY "Users can view their own document chunks" ON public.document_chunks
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own document chunks" ON public.document_chunks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own document chunks" ON public.document_chunks
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own document chunks" ON public.document_chunks
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  document_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  user_id text NOT NULL,
  content text NOT NULL,
  is_user boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE
);

-- Create chat_documents junction table
CREATE TABLE IF NOT EXISTS public.chat_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, document_id)
);

-- Create indexes for chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Create indexes for chat_documents
CREATE INDEX IF NOT EXISTS idx_chat_documents_chat_id ON public.chat_documents(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_documents_document_id ON public.chat_documents(document_id);

-- Enable RLS for chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own chats" ON public.chats
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own chats" ON public.chats
  FOR DELETE USING (auth.uid()::text = user_id);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (auth.uid()::text = user_id);

-- Enable RLS for chat_documents
ALTER TABLE public.chat_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_documents
CREATE POLICY "Users can view chat_documents for their chats" ON public.chat_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = chat_documents.chat_id 
      AND chats.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert chat_documents for their chats" ON public.chat_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = chat_documents.chat_id 
      AND chats.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete chat_documents for their chats" ON public.chat_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = chat_documents.chat_id 
      AND chats.user_id = auth.uid()::text
    )
  );

