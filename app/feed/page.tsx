import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { DAILY_LIMIT } from "@/lib/ai";
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
import ThemeHero, { SignedOutCta } from "@/app/_components/ThemeHero";
import GenerateForm from "./GenerateForm";

// Gemini + Flux can take a while; this also applies to the page's Server Actions.
export const maxDuration = 60;

export const metadata = { title: "Today's feed" };

const TABS = {
  today: "Today's top",
  new: "Newest",
  all: "All-time top",
} as const;
type Tab = keyof typeof TABS;

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  // Anyone can browse; creating and voting need an account.
  const { supabase, user, profile } = await getUserAndProfile();
  if (user && !isProfileComplete(profile)) redirect("/onboarding");
  const signedIn = Boolean(user);

  const { tab: tabParam } = await searchParams;
  const tab: Tab = typeof tabParam === "string" && tabParam in TABS ? (tabParam as Tab) : "today";
  const dayStart = nyDayStart();

  let query = supabase.from("generations").select(generationColumns(signedIn));
  if (tab === "today") query = query.gte("created_at", dayStart);
  query =
    tab === "new"
      ? query.order("created_at", { ascending: false })
      : query.order("score", { ascending: false }).order("created_at", { ascending: false });

  const [theme, usedToday, feed, winners] = await Promise.all([
    getTodaysTheme(),
    user
      ? supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", dayStart)
          .then((r) => r.count ?? 0)
      : 0,
    query.limit(60).overrideTypes<GenerationRow[], { merge: false }>(),
    getDailyWinners(supabase, signedIn, { days: 7, perDay: 1 }),
  ]);

  const riffs = await toRiffs(supabase, user?.id ?? null, feed.data ?? []);
  const champ = winners[0]?.top[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <ThemeHero theme={theme}>
        {user ? (
          <GenerateForm remaining={Math.max(0, DAILY_LIMIT - usedToday)} limit={DAILY_LIMIT} />
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

      <div className="mt-10 mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex gap-1 rounded-full border border-line bg-surface p-1 text-sm font-medium">
          {(Object.keys(TABS) as Tab[]).map((key) => (
            <Link
              key={key}
              href={key === "today" ? "/feed" : `/feed?tab=${key}`}
              aria-current={tab === key ? "page" : undefined}
              className={`rounded-full px-4 py-2 transition-colors ${
                tab === key ? "bg-ink text-bg" : "text-muted hover:text-ink"
              }`}
            >
              {TABS[key]}
            </Link>
          ))}
        </nav>
        <Link
          href="/battle"
          className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-strong hover:bg-brand/20 dark:bg-brand/15 dark:text-brand"
        >
          ⚡ Play “Which is funnier?”
        </Link>
      </div>

      {feed.error ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Couldn&apos;t load the feed: {feed.error.message}
        </p>
      ) : riffs.length === 0 ? (
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
      ) : (
        <RiffGrid riffs={riffs} signedIn={signedIn} ranked={tab !== "new"} podium={tab !== "new"} />
      )}
    </main>
  );
}
