import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { supabaseEnv } from './env';

/** Browser client for Client Components. */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
