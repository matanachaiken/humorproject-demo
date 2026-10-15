import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import {
  generationColumns,
  getDailyWinners,
  toRiffs,
  type GenerationRow,
} from "@/lib/generations";
import RiffGrid from "@/app/_components/RiffGrid";

export const metadata = { title: "My riffs" };

export default async function MePage() {
  const { supabase, user, profile } = await requireCompleteProfile();

  const [{ data: mine }, { data: everyone }, { count: judged }, winners] = await Promise.all([
    supabase
      .from("generations")
      .select(generationColumns(true))
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500)
      .overrideTypes<GenerationRow[], { merge: false }>(),
    supabase.from("generations").select("user_id, score").limit(10000),
    supabase.from("matchups").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    getDailyWinners(supabase, true, { days: 365, perDay: 1 }),
  ]);

  const rows = mine ?? [];
  const riffs = await toRiffs(supabase, user.id, rows);
  const totalScore = rows.reduce((sum, r) => sum + r.score, 0);
  const wins = rows.reduce((sum, r) => sum + r.wins, 0);
  const losses = rows.reduce((sum, r) => sum + r.losses, 0);
  const dailyWins = winners.filter((w) => w.top[0]?.user_id === user.id).length;

  // Creator rank by total points across all of their riffs.
  const totals = new Map<string, number>();
  for (const r of everyone ?? []) totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + r.score);
  const rank = rows.length
    ? [...totals.values()].filter((score) => score > totalScore).length + 1
    : null;

  const stats = [
    { label: "Riffs made", value: rows.length },
    { label: "Total points", value: totalScore },
    { label: "Creator rank", value: rank ? `#${rank}` : "—", hint: rank ? `of ${totals.size}` : undefined },
    {
      label: "Battle win rate",
      value: wins + losses ? `${Math.round((wins / (wins + losses)) * 100)}%` : "—",
      hint: wins + losses ? `${wins}–${losses}` : undefined,
    },
    { label: "Daily wins", value: dailyWins ? `🏆 ${dailyWins}` : "0" },
    { label: "Matchups judged", value: judged ?? 0 },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center gap-5">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-brand-soft" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft font-display text-3xl font-bold text-brand-strong">
            {profile.first_name?.[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="truncate text-muted">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/profile" className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2">
            Edit profile
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-line bg-surface p-4">
            <dt className="text-xs font-medium text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular-nums">
              {s.value}
              {s.hint && <span className="ml-1.5 text-sm font-medium text-muted">{s.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-12 mb-5 font-display text-2xl font-bold">Your riffs</h2>
      {riffs.length ? (
        <RiffGrid riffs={riffs} signedIn />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-line p-12 text-center">
          <p className="text-4xl">✨</p>
          <p className="mt-3 font-display text-xl font-bold">You haven&apos;t made a riff yet</p>
          <p className="mt-1 text-muted">Today&apos;s theme is waiting for you.</p>
          <Link
            href="/feed"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong"
          >
            Make your first →
          </Link>
        </div>
      )}
    </main>
  );
}
