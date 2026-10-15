import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { nyDayStart } from "@/lib/day";
import { generationColumns, toRiffs, type GenerationRow } from "@/lib/generations";
import { pickPair } from "@/lib/matchups";
import BattleArena from "./BattleArena";

export const metadata = { title: "Which is funnier?" };

export default async function BattlePage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (user && !isProfileComplete(profile)) redirect("/onboarding");

  // The 200 newest riffs, minus your own (you can't judge yourself).
  let query = supabase
    .from("generations")
    .select(generationColumns(Boolean(user)))
    .order("created_at", { ascending: false })
    .limit(200);
  if (user) query = query.neq("user_id", user.id);

  // Pairs come back each day, so only today's picks rule a pair out.
  const [{ data: candidates }, { data: judgedToday }, { count: judgedTotal }] = await Promise.all([
    query.overrideTypes<GenerationRow[], { merge: false }>(),
    user
      ? supabase
          .from("matchups")
          .select("winner_id, loser_id")
          .eq("user_id", user.id)
          .gte("created_at", nyDayStart())
          .limit(10000)
      : Promise.resolve({ data: [] as { winner_id: number; loser_id: number }[] }),
    user
      ? supabase.from("matchups").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
  ]);

  const pair = pickPair(candidates ?? [], judgedToday ?? []);
  const riffs = pair ? await toRiffs(supabase, user?.id ?? null, pair) : null;
  const judgedCount = judgedTotal ?? 0;
  const doneForToday = (judgedToday?.length ?? 0) > 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <p className="text-xs font-bold tracking-wider text-brand uppercase">⚡ Head to head</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Which is funnier?
          </h1>
          <p className="mt-2 text-muted">
            Two riffs, one winner. Your picks decide each riff&apos;s win rate.
          </p>
        </div>
        {user && (
          <p className="rounded-full border border-line bg-surface px-4 py-2 text-sm">
            You&apos;ve judged <span className="font-bold tabular-nums">{judgedCount}</span>{" "}
            {judgedCount === 1 ? "matchup" : "matchups"}
          </p>
        )}
      </div>

      {riffs ? (
        <BattleArena
          key={`${riffs[0].id}-${riffs[1].id}`}
          pair={[riffs[0], riffs[1]]}
          signedIn={Boolean(user)}
        />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-line p-12 text-center">
          <p className="text-4xl">{doneForToday ? "🎉" : "🌱"}</p>
          <p className="mt-3 font-display text-xl font-bold">
            {doneForToday ? "You've judged every matchup today!" : "Not enough riffs to battle yet"}
          </p>
          <p className="mt-1 text-muted">
            {doneForToday
              ? "Every pair comes back for a rematch at midnight, and new riffs add new pairs."
              : "Battles need at least two riffs from other people."}
          </p>
          <Link
            href="/feed"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong"
          >
            Go make one →
          </Link>
        </div>
      )}
    </main>
  );
}
