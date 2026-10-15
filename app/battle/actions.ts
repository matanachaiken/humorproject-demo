"use server";

import { getUserAndProfile } from "@/lib/auth";
import { readXp } from "@/lib/xp";

export type JudgeResult =
  | { ok: true; records: Record<number, { wins: number; losses: number }>; xp: number }
  | { ok: false; error: string };

export async function judgeMatchup(winnerId: number, loserId: number): Promise<JudgeResult> {
  // Server actions are reachable by direct POST, so always check the session here.
  // RLS also blocks judging your own riffs, as a second line of defense.
  const { supabase, user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Sign in to pick a winner." };
  if (!Number.isInteger(winnerId) || !Number.isInteger(loserId) || winnerId === loserId) {
    return { ok: false, error: "Invalid matchup." };
  }

  const { error } = await supabase
    .from("matchups")
    .insert({ user_id: user.id, winner_id: winnerId, loser_id: loserId });
  // 23505: already judged this pair (e.g. a double tap). Just show the results.
  if (error && error.code !== "23505") {
    console.error("Matchup failed:", error);
    return {
      ok: false,
      error: error.code === "42501" ? "You can't judge your own riff." : "Couldn't save your pick.",
    };
  }

  const [{ data }, xp] = await Promise.all([
    supabase.from("generations").select("id, wins, losses").in("id", [winnerId, loserId]),
    readXp(supabase, user.id),
  ]);
  const records: Record<number, { wins: number; losses: number }> = {};
  for (const row of data ?? []) records[row.id] = { wins: row.wins, losses: row.losses };
  return { ok: true, records, xp };
}
