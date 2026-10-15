import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// The player's XP right after an action, so the client can animate the gain.
export async function readXp(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("player_stats").select("xp").eq("user_id", userId).maybeSingle();
  return (data?.xp as number | undefined) ?? 0;
}
