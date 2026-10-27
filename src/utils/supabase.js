import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Sanitizar URL por si se incluyó /rest/v1 o diagonales finales
const cleanUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const cleanKey = rawAnonKey.trim();

export const isSupabaseConfigured = Boolean(
  cleanUrl && 
  cleanKey && 
  cleanUrl.startsWith('https://') &&
  cleanKey !== 'TU_SUPABASE_ANON_KEY'
);

export const supabase = isSupabaseConfigured
  ? createClient(cleanUrl, cleanKey)
  : null;
