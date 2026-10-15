import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses RLS. Only used for data the server itself owns
// (AI generations and daily themes), never with user-controlled filters.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) return null;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
