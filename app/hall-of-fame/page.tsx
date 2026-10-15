import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { formatDay } from "@/lib/day";
import { getDailyWinners, toRiffs } from "@/lib/generations";
import RiffGrid from "@/app/_components/RiffGrid";

export const metadata = { title: "Hall of Fame" };

export default async function HallOfFamePage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (user && !isProfileComplete(profile)) redirect("/onboarding");

  const winners = await getDailyWinners(supabase, Boolean(user), { days: 60, perDay: 3 });
  const days = await Promise.all(
    winners.map(async (w) => ({ ...w, riffs: await toRiffs(supabase, user?.id ?? null, w.top) }))
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
        🏆 Hall of Fame
      </p>
      <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        Every day&apos;s funniest
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        When the theme flips at midnight, the top three riffs of the day are locked in here
        for good.
      </p>

      {days.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-line p-12 text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-3 font-display text-xl font-bold">No champions yet</p>
          <p className="mt-1 text-muted">
            The first winners land here after midnight. Today&apos;s top riffs are in the running.
          </p>
          <Link
            href="/feed"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong"
          >
            See today&apos;s race →
          </Link>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-14">
          {days.map((d) => (
            <section key={d.day}>
              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-3">
                <h2 className="font-display text-2xl font-bold">{d.theme}</h2>
                <p className="text-sm text-muted">{formatDay(d.day, "long")}</p>
              </div>
              <RiffGrid riffs={d.riffs} signedIn={Boolean(user)} ranked />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
