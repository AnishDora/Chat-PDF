-- Migration to add document_ids column to existing chats table
-- Run this in your Supabase SQL editor if you already have a chats table

-- Add document_ids column to chats table if it doesn't exist
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS document_ids text[] DEFAULT '{}';

-- Update existing chats to have empty document_ids array if they are null
UPDATE public.chats 
SET document_ids = '{}' 
WHERE document_ids IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_chats_document_ids ON public.chats USING gin(document_ids);

-- Add foreign key constraint to messages table if it doesn't exist
-- First check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_chat_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages 
        ADD CONSTRAINT messages_chat_id_fkey 
        FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
    END IF;
END $$;
