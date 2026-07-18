import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

if (!env.supabase.url || !env.supabase.serviceRoleKey) {
  throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

function readJwtRole(token: string): string | undefined {
  const payload = token.split('.')[1];

  if (!payload) {
    return undefined;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsedPayload = JSON.parse(Buffer.from(normalizedPayload, 'base64').toString('utf8')) as { role?: string };
    return parsedPayload.role;
  } catch {
    return undefined;
  }
}

if (readJwtRole(env.supabase.serviceRoleKey) !== 'service_role') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY must be the Supabase service_role key, not the anon public key.');
}

export const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
