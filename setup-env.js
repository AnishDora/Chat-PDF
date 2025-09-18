#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envExample = `# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI API Key (required for RAG functionality)
OPENAI_API_KEY=your_openai_api_key
`;

const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envExample);
  console.log('✅ Created .env.local file with required environment variables');
  console.log('📝 Please update the values in .env.local with your actual API keys');
} else {
  console.log('⚠️  .env.local already exists');
}

console.log('\n🔧 Required setup steps:');
console.log('1. Update .env.local with your API keys');
console.log('2. Run the SQL from supabase-setup.sql in your Supabase dashboard');
console.log('3. Start the development server with: npm run dev');
console.log('\n📚 RAG functionality is now enabled!');
console.log('   - Upload PDFs to extract text and create embeddings');
console.log('   - Ask questions and get answers based on your PDFs only');
