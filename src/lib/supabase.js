import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error('Supabase credentials not configured. Edit .env file with your Supabase URL and anon key.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
