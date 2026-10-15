import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { nyToday } from "@/lib/day";

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export function isProfileComplete(profile: Profile | null) {
  return Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
}

export type SessionUser = { id: string; email: string | null };

// The signed-in user, verified from the session's signed JWT. The project
// uses asymmetric signing keys, so this is checked locally instead of with a
// round trip to Supabase Auth on every request.
export async function getSessionUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

export type Progress = {
  xp: number;
  streak: number;
  bestStreak: number;
  streakFreezes: number;
  seenLevel: number;
  // Won an extra creation on today's wheel.
  hasBonusCreation: boolean;
  spunToday: boolean;
};

const NEW_PLAYER: Progress = {
  xp: 0,
  streak: 0,
  bestStreak: 0,
  streakFreezes: 0,
  seenLevel: 1,
  hasBonusCreation: false,
  spunToday: false,
};

// Cached per request, so the header and the page share one lookup.
export const getUserAndProfile = cache(async () => {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { supabase, user: null, profile: null, progress: null };

  const today = nyToday();
  const [{ data: profile }, { data: stats }, { count: spins }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
    supabase
      .from("player_stats")
      .select("xp, streak, best_streak, streak_freezes, seen_level, bonus_creation_day")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("wheel_spins")
      .select("day", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("day", today),
  ]);

  const progress: Progress = stats
    ? {
        xp: stats.xp,
        streak: stats.streak,
        bestStreak: stats.best_streak,
        streakFreezes: stats.streak_freezes,
        seenLevel: stats.seen_level,
        hasBonusCreation: stats.bonus_creation_day === today,
        spunToday: (spins ?? 0) > 0,
      }
    : { ...NEW_PLAYER, spunToday: (spins ?? 0) > 0 };

  return { supabase, user, profile, progress };
});

// Use in protected pages: sends signed-out users to /login and
// users without a first/last name to /onboarding.
export async function requireCompleteProfile() {
  const result = await getUserAndProfile();
  if (!result.user) redirect("/login");
  if (!isProfileComplete(result.profile)) redirect("/onboarding");
  return { ...result, user: result.user, profile: result.profile!, progress: result.progress! };
}

// Where to send someone after signing in. Only same-site paths are allowed,
// so a crafted link can't bounce users to another website.
export function safeNextPath(next: string | null | undefined, fallback = "/feed") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (next === "/" || next.startsWith("/login") || next.startsWith("/auth")) return fallback;
  return next;
}
