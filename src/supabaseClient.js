import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Tarayıcı/sekme kapanınca oturum sona ersin (localStorage yerine sessionStorage)
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
