import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { dailyLimit, levelInfo } from "@/lib/progression";
import { getTodaysTheme } from "@/lib/theme";
import { nyDayStart } from "@/lib/day";
import {
  generationColumns,
  getDailyWinners,
  imageUrl,
  toRiffs,
  type GenerationRow,
} from "@/lib/generations";
import ChampStrip from "@/app/_components/ChampStrip";
import RiffGrid from "@/app/_components/RiffGrid";
import { GridSkeleton, HeroSkeleton } from "@/app/_components/Skeletons";
import ThemeHero, { SignedOutCta } from "@/app/_components/ThemeHero";
import FeedTabs from "./FeedTabs";
import { TABS, type Tab } from "./tabs";
import GenerateForm from "./GenerateForm";

// Gemini + Flux can take a while; this also applies to the page's Server Actions.
export const maxDuration = 60;

export const metadata = { title: "Today's feed" };

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  // Anyone can browse; creating and voting need an account.
  const { user, profile } = await getUserAndProfile();
  if (user && !isProfileComplete(profile)) redirect("/onboarding");

  const { tab: tabParam } = await searchParams;
  const tab: Tab = typeof tabParam === "string" && tabParam in TABS ? (tabParam as Tab) : "today";

  // The page shell renders right away; the hero and the grid stream in.
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<HeroSkeleton />}>
        <FeedHero />
      </Suspense>

      <div className="mt-10 mb-6 flex flex-wrap items-center justify-between gap-4">
        <FeedTabs tab={tab} />
        <Link
          href="/battle"
          className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-strong hover:bg-brand/20 dark:bg-brand/15 dark:text-brand"
        >
          ⚡ Play “Which is funnier?”
        </Link>
      </div>

      {/* Keyed by tab so switching tabs shows the skeleton instead of stale cards. */}
      <Suspense key={tab} fallback={<GridSkeleton />}>
        <FeedList tab={tab} />
      </Suspense>
    </main>
  );
}

async function FeedHero() {
  const { supabase, user, progress } = await getUserAndProfile();
  const [theme, usedToday, winners] = await Promise.all([
    getTodaysTheme(),
    user
      ? supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", nyDayStart())
          .then((r) => r.count ?? 0)
      : 0,
    getDailyWinners(supabase, Boolean(user), { days: 7, perDay: 1 }),
  ]);
  const champ = winners[0]?.top[0];

  return (
    <>
      <ThemeHero theme={theme}>
        {user && progress ? (
          <GenerateFormFor xp={progress.xp} bonus={progress.hasBonusCreation} used={usedToday} />
        ) : (
          <SignedOutCta />
        )}
      </ThemeHero>
      {champ && (
        <div className="mt-6">
          <ChampStrip
            id={champ.id}
            day={winners[0].day}
            caption={champ.caption}
            creator={champ.creator_name}
            score={champ.score}
            imageUrl={imageUrl(supabase, champ.storage_path)}
          />
        </div>
      )}
    </>
  );
}

function GenerateFormFor({ xp, bonus, used }: { xp: number; bonus: boolean; used: number }) {
  const { level } = levelInfo(xp);
  const limit = dailyLimit(level, bonus);
  return <GenerateForm remaining={Math.max(0, limit - used)} limit={limit} level={level} />;
}

async function FeedList({ tab }: { tab: Tab }) {
  const { supabase, user } = await getUserAndProfile();

  let query = supabase.from("generations").select(generationColumns(Boolean(user)));
  if (tab === "today") query = query.gte("created_at", nyDayStart());
  query =
    tab === "new"
      ? query.order("created_at", { ascending: false })
      : query.order("score", { ascending: false }).order("created_at", { ascending: false });
  const { data, error } = await query.limit(60).overrideTypes<GenerationRow[], { merge: false }>();

  if (error) {
    return (
      <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        Couldn&apos;t load the feed: {error.message}
      </p>
    );
  }

  const riffs = await toRiffs(supabase, user?.id ?? null, data ?? []);
  if (riffs.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-line p-12 text-center">
        <p className="text-4xl">🎨</p>
        <p className="mt-3 font-display text-xl font-bold">
          {tab === "today" ? "Nothing yet today" : "No riffs yet"}
        </p>
        <p className="mt-1 text-muted">
          {user
            ? "Be the first to riff on the theme. Type an idea above!"
            : "Sign in and be the first to riff on today's theme."}
        </p>
      </div>
    );
  }

  return (
    <RiffGrid riffs={riffs} signedIn={Boolean(user)} ranked={tab !== "new"} podium={tab !== "new"} />
  );
}
