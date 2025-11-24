import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use proxy in development to avoid CORS issues
// The client requires a valid URL string starting with http/https
const isDev = import.meta.env.DEV;
const clientUrl = isDev
    ? `${window.location.origin}/supaproxy`
    : (supabaseUrl || 'https://placeholder.supabase.co'); // Fallback to avoid crash if env var missing

export const supabase = createClient(clientUrl, supabaseAnonKey || '');
