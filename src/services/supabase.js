// src/services/supabase.js - Add logging
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase configuration');
}

console.log('🔧 Initializing Supabase client...');
console.log('URL:', supabaseUrl.substring(0, 20) + '...');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: localStorage,
    storageKey: 'supabase.auth.token'
  }
});

// Test connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection error:', error);
  } else {
    console.log('✅ Supabase connected. Session:', data.session ? 'Active' : 'None');
  }
});