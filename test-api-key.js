#!/usr/bin/env node

// Test the API key in the application context
require('dotenv').config({ path: '.env.local' });

async function testAPIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found in .env.local');
    return;
  }
  
  console.log('✅ API key found in environment');
  console.log(`🔑 Key starts with: ${apiKey.substring(0, 20)}...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log('✅ API key is valid and working!');
      console.log('🎉 RAG functionality should now work properly');
    } else if (response.status === 429) {
      console.log('⚠️  API key is valid but quota exceeded');
      console.log('💡 Check your billing: https://platform.openai.com/account/billing');
    } else if (response.status === 401) {
      console.log('❌ Invalid API key');
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error testing API:', error.message);
  }
}

testAPIKey();
