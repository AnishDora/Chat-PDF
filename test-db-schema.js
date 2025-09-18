#!/usr/bin/env node

// Quick test script to verify database schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchema() {
  try {
    console.log('🔍 Testing database schema...');
    
    // Test chats table structure
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .limit(1);
    
    if (chatsError) {
      console.log('❌ Error accessing chats table:', chatsError.message);
      return;
    }
    
    console.log('✅ Chats table accessible');
    
    // Test if document_ids column exists by trying to insert a test record
    const testChat = {
      user_id: 'test-user',
      title: 'Test Chat',
      document_ids: ['test-doc-1', 'test-doc-2']
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('chats')
      .insert(testChat)
      .select()
      .single();
    
    if (insertError) {
      if (insertError.message.includes('document_ids')) {
        console.log('❌ document_ids column missing from chats table');
        console.log('📝 Please run the migration script: migration-add-document-ids.sql');
        return;
      }
      console.log('⚠️  Insert test failed (expected if RLS is enabled):', insertError.message);
    } else {
      console.log('✅ document_ids column exists and works');
      
      // Clean up test data
      await supabase
        .from('chats')
        .delete()
        .eq('id', insertData.id);
    }
    
    // Test document_chunks table
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(1);
    
    if (chunksError) {
      console.log('❌ Error accessing document_chunks table:', chunksError.message);
      console.log('📝 Please run the supabase-setup.sql script');
      return;
    }
    
    console.log('✅ document_chunks table accessible');
    
    // Test messages table and foreign key relationship
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.log('❌ Error accessing messages table:', messagesError.message);
      console.log('📝 Please run the supabase-setup.sql script');
      return;
    }
    
    console.log('✅ messages table accessible');
    
    // Test foreign key relationship by trying to join chats and messages
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _chatMessages, error: joinError } = await supabase
      .from('chats')
      .select(`
        *,
        messages(*)
      `)
      .limit(1);
    
    if (joinError) {
      console.log('❌ Error joining chats and messages:', joinError.message);
      console.log('📝 Foreign key relationship may be missing. Run the migration script.');
      return;
    }
    
    console.log('✅ Foreign key relationship between chats and messages works');
    
    console.log('🎉 Database schema looks good!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testSchema();
