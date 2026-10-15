import "server-only";
import { createClient } from "@supabase/supabase-js";

// Reads one riff with the public (signed-out) key, for downloads and share
// cards. No cookies, so responses can be cached by the CDN.
export async function getPublicRiff(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await supabase
    .from("generations")
    .select("id, caption, theme, creator_name, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    imageUrl: supabase.storage.from("generations").getPublicUrl(data.storage_path).data.publicUrl,
  };
}

// Captions and images never change once made.
export const CACHE_FOREVER = "public, max-age=86400, s-maxage=31536000, immutable";
