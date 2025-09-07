-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, -- Clerk user id string
  title text NOT NULL, -- a nice name, usually file name without .pdf
  storage_path text NOT NULL, -- where the file is stored in Supabase Storage
  bytes bigint, -- file size (optional)
  page_count int, -- we'll fill this later during ingest (optional)
  status text DEFAULT 'processing', -- 'processing' | 'ready' | 'failed'
  created_at timestamptz DEFAULT now()
);

-- Create chats table for multiple chats per user
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, -- Clerk user id string
  title text NOT NULL, -- chat title
  document_ids uuid[] DEFAULT '{}', -- array of document IDs in this chat
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table for chat messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id text NOT NULL, -- Clerk user id string
  content text NOT NULL, -- message content
  is_user boolean NOT NULL DEFAULT true, -- true for user messages, false for AI responses
  created_at timestamptz DEFAULT now()
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);

-- Create indexes for chats table
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents table
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for chats table
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own chats" ON public.chats
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own chats" ON public.chats
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for messages table
CREATE POLICY "Users can view messages from their chats" ON public.messages
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert messages to their chats" ON public.messages
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
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
