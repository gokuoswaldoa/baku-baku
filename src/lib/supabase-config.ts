export interface SupabaseEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export function readSupabaseConfig(environment: SupabaseEnvironment) {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) throw new Error('Falta configurar Supabase en .env.local.');
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error('VITE_SUPABASE_URL debe ser una URL válida.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && local))
    || parsed.username || parsed.password || parsed.search || parsed.hash
    || parsed.pathname !== '/') {
    throw new Error('VITE_SUPABASE_URL debe ser el origen HTTPS del proyecto o un origen local HTTP.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error('Utiliza una clave publishable en VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  return { url: parsed.origin, publishableKey };
}
