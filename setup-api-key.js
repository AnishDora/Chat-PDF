#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the API key from env or CLI arg instead of hardcoding
// Usage: OPENAI_API_KEY=sk-... node setup-api-key.js
//    or: node setup-api-key.js sk-...
const apiKeyFromEnv = process.env.OPENAI_API_KEY;
const apiKeyFromArg = process.argv[2];
const apiKey = apiKeyFromArg || apiKeyFromEnv || '';

if (!apiKey) {
  console.log('❌ No OpenAI API key provided.');
  console.log('   Set OPENAI_API_KEY env var or pass as an argument.');
  process.exit(1);
}

const envContent = `# OpenAI API Key
OPENAI_API_KEY=${apiKey}

# Add your other environment variables here
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
# CLERK_SECRET_KEY=your_clerk_secret_key
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
`;

const envPath = path.join(__dirname, '.env.local');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Successfully created .env.local with your OpenAI API key');
  console.log('🔄 Please restart your development server for the changes to take effect');
  console.log('📝 Run: npm run dev');
} catch (error) {
  console.log('❌ Error creating .env.local:', error.message);
  console.log('📝 Please manually create .env.local with the following content:');
  console.log('\n' + envContent);
}

