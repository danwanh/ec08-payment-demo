import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

if (!env.supabase.url || !env.supabase.serviceRoleKey) {
  throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
