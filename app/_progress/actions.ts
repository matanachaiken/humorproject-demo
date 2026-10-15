"use server";

import { getUserAndProfile } from "@/lib/auth";
import { PRIZES, type PrizeId } from "@/lib/progression";
import { readXp } from "@/lib/xp";

export type SpinResult = { ok: true; prize: PrizeId; xp: number } | { ok: false; error: string };

export async function spinWheel(): Promise<SpinResult> {
  // The database picks the prize and enforces one spin per day.
  const { supabase, user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Sign in to spin the wheel." };

  const { data, error } = await supabase.rpc("spin_wheel");
  if (error) {
    console.error("Spin failed:", error);
    return { ok: false, error: "The wheel got stuck. Try again." };
  }
  const result = data as { prize?: string; error?: string };
  if (result.error === "already_spun") {
    return { ok: false, error: "You've already spun today. Come back tomorrow!" };
  }
  const prize = PRIZES.find((p) => p.id === result.prize);
  if (!prize) return { ok: false, error: "The wheel got stuck. Try again." };
  return { ok: true, prize: prize.id, xp: await readXp(supabase, user.id) };
}

// Remembers that the player has seen the level-up screen for `level`.
export async function ackLevel(level: number) {
  const { supabase, user } = await getUserAndProfile();
  if (!user || !Number.isInteger(level)) return;
  await supabase.rpc("ack_level", { p_level: level });
}
