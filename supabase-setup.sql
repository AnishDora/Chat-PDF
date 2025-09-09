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
