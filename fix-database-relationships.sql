-- Comprehensive database fix script
-- Run this in your Supabase SQL editor to fix all relationship issues

-- 1. Add document_ids column to chats table if it doesn't exist
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS document_ids text[] DEFAULT '{}';

-- 2. Update existing chats to have empty document_ids array if they are null
UPDATE public.chats 
SET document_ids = '{}' 
WHERE document_ids IS NULL;

-- 3. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_chats_document_ids ON public.chats USING gin(document_ids);

-- 4. Add foreign key constraint to messages table if it doesn't exist
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

-- 5. Add foreign key constraint to chat_documents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_documents_chat_id_fkey' 
        AND table_name = 'chat_documents'
    ) THEN
        ALTER TABLE public.chat_documents 
        ADD CONSTRAINT chat_documents_chat_id_fkey 
        FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Add foreign key constraint to chat_documents document_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_documents_document_id_fkey' 
        AND table_name = 'chat_documents'
    ) THEN
        ALTER TABLE public.chat_documents 
        ADD CONSTRAINT chat_documents_document_id_fkey 
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Add foreign key constraint to document_chunks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'document_chunks_document_id_fkey' 
        AND table_name = 'document_chunks'
    ) THEN
        ALTER TABLE public.document_chunks 
        ADD CONSTRAINT document_chunks_document_id_fkey 
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 8. Verify all relationships are working
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('messages', 'chat_documents', 'document_chunks')
ORDER BY tc.table_name, tc.constraint_name;
