"use server";

import { getUserAndProfile } from "@/lib/auth";
import { WRITERS_ROOM_LEVEL, levelInfo } from "@/lib/progression";

export type ThemeVoteResult = { ok: true } | { ok: false; error: string };

export async function voteTheme(candidateId: number): Promise<ThemeVoteResult> {
  // RLS enforces the level requirement and the voting window too.
  const { supabase, user, progress } = await getUserAndProfile();
  if (!user || !progress) return { ok: false, error: "Sign in to vote." };
  if (levelInfo(progress.xp).level < WRITERS_ROOM_LEVEL) {
    return { ok: false, error: `The Writers' Room opens at level ${WRITERS_ROOM_LEVEL}.` };
  }
  if (!Number.isInteger(candidateId)) return { ok: false, error: "Invalid theme." };

  const { data: candidate } = await supabase
    .from("theme_candidates")
    .select("for_day")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return { ok: false, error: "That theme isn't on the ballot anymore." };

  // First vote for that day: insert. Already voted (unique violation): switch it.
  let { error } = await supabase
    .from("theme_votes")
    .insert({ user_id: user.id, for_day: candidate.for_day, candidate_id: candidateId });
  if (error?.code === "23505") {
    ({ error } = await supabase
      .from("theme_votes")
      .update({ candidate_id: candidateId })
      .eq("user_id", user.id)
      .eq("for_day", candidate.for_day));
  }
  if (error) {
    console.error("Theme vote failed:", error);
    return { ok: false, error: "Voting for that day has closed." };
  }
  return { ok: true };
}
