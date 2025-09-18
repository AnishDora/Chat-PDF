#!/usr/bin/env node

// Script to check OpenAI API quota and provide guidance

async function checkOpenAIQuota() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found in environment variables');
    console.log('📝 Please add your OpenAI API key to .env.local:');
    console.log('   OPENAI_API_KEY=your_api_key_here');
    return;
  }

  console.log('🔍 Checking OpenAI API quota...');
  
  try {
    // Make a simple API call to check quota
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log('✅ OpenAI API key is valid and working');
      console.log('💡 If you\'re getting quota errors, check your OpenAI billing:');
      console.log('   https://platform.openai.com/account/billing');
    } else if (response.status === 429) {
      console.log('❌ OpenAI API quota exceeded');
      console.log('💡 Solutions:');
      console.log('   1. Check your billing: https://platform.openai.com/account/billing');
      console.log('   2. Upgrade your plan: https://platform.openai.com/pricing');
      console.log('   3. Wait for quota reset (usually monthly)');
      console.log('   4. Use the fallback mode (PDFs will upload but RAG won\'t work)');
    } else if (response.status === 401) {
      console.log('❌ Invalid OpenAI API key');
      console.log('📝 Please check your API key in .env.local');
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
      console.log('📝 Please check your OpenAI account and API key');
    }
  } catch (error) {
    console.log('❌ Error checking OpenAI API:', error.message);
    console.log('📝 Please check your internet connection and API key');
  }
}

checkOpenAIQuota();
