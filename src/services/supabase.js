// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anon key. Check your .env file.');
}

console.log('🔧 Initializing Supabase client...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Development-only session logging
if (import.meta.env.DEV) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    console.log('✅ Supabase ready · Session:', session ? 'Active' : 'None');
    if (session) console.log('👤 Logged in as:', session.user.email);
  });
}