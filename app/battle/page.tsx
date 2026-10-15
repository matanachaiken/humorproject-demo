import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
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

  const [{ data: candidates }, { data: judged }] = await Promise.all([
    query.overrideTypes<GenerationRow[], { merge: false }>(),
    user
      ? supabase.from("matchups").select("winner_id, loser_id").eq("user_id", user.id).limit(10000)
      : Promise.resolve({ data: [] as { winner_id: number; loser_id: number }[] }),
  ]);

  const pair = pickPair(candidates ?? [], judged ?? []);
  const riffs = pair ? await toRiffs(supabase, user?.id ?? null, pair) : null;
  const judgedCount = judged?.length ?? 0;

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
          <p className="text-4xl">{judgedCount ? "🎉" : "🌱"}</p>
          <p className="mt-3 font-display text-xl font-bold">
            {judgedCount ? "You've judged every matchup!" : "Not enough riffs to battle yet"}
          </p>
          <p className="mt-1 text-muted">
            {judgedCount
              ? "Come back after more people post today's riffs."
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
