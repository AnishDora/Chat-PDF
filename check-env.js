#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const required = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

let ok = true;
for (const key of required) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    console.log(`❌ Missing ${key}`);
    ok = false;
  }
}

if (ok) {
  console.log('✅ All required environment variables are set');
  process.exit(0);
} else {
  console.log('\nℹ️  Create or update .env.local with the missing values.');
  process.exit(1);
}
