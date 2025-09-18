#!/usr/bin/env node

// Test script to verify document detection in chats
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDocumentDetection() {
  try {
    console.log('🔍 Testing document detection in chats...');
    
    // Get all chats with document_ids
    const { data: chats, error } = await supabase
      .from('chats')
      .select('id, title, document_ids')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Error fetching chats:', error.message);
      return;
    }
    
    console.log(`✅ Found ${chats.length} chats`);
    
    chats.forEach((chat, index) => {
      console.log(`\nChat ${index + 1}:`);
      console.log(`  ID: ${chat.id}`);
      console.log(`  Title: ${chat.title}`);
      console.log(`  Document IDs: ${JSON.stringify(chat.document_ids)}`);
      console.log(`  Document Count: ${chat.document_ids ? chat.document_ids.length : 0}`);
    });
    
    // Test a specific chat if available
    if (chats.length > 0) {
      const testChat = chats[0];
      console.log(`\n🧪 Testing chat: ${testChat.title}`);
      
      if (testChat.document_ids && testChat.document_ids.length > 0) {
        console.log(`✅ Chat has ${testChat.document_ids.length} documents`);
        
        // Check if documents exist
        const { data: documents, error: docError } = await supabase
          .from('documents')
          .select('id, title, status')
          .in('id', testChat.document_ids);
        
        if (docError) {
          console.log('❌ Error fetching documents:', docError.message);
        } else {
          console.log(`✅ Found ${documents.length} documents in database:`);
          documents.forEach(doc => {
            console.log(`  - ${doc.title} (${doc.status})`);
          });
        }
      } else {
        console.log('⚠️  Chat has no documents');
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testDocumentDetection();
