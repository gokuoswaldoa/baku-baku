import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './supabase-config';

let client: SupabaseClient | undefined;

// Called explicitly by a future authorized module. Importing this file makes no requests.
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = readSupabaseConfig(import.meta.env);
    client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
