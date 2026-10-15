import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodaysTheme } from "@/lib/theme";
import { nyDayStart } from "@/lib/day";
import { generationColumns, toRiffs, type GenerationRow } from "@/lib/generations";
import RiffGrid from "@/app/_components/RiffGrid";
import ThemeHero, { SignedOutCta } from "@/app/_components/ThemeHero";

const STEPS = [
  { emoji: "🗞️", title: "Get the theme", body: "Every midnight AI turns what NYC and college Reddit are buzzing about into a fresh theme." },
  { emoji: "✨", title: "Riff on it", body: "Type a silly idea. AI writes the prompt, draws the image and adds a caption in ~15 seconds." },
  { emoji: "⚡", title: "Vote & battle", body: "Upvote favorites and play “Which is funnier?” The day's top three enter the Hall of Fame." },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  const top = (since?: string) => {
    let query = supabase.from("generations").select(generationColumns(false));
    if (since) query = query.gte("created_at", since);
    return query
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6)
      .overrideTypes<GenerationRow[], { merge: false }>();
  };

  const [theme, today, allTime] = await Promise.all([getTodaysTheme(), top(nyDayStart()), top()]);
  // Early in the day there may be little to show, so fall back to all-time favorites.
  const showToday = (today.data?.length ?? 0) >= 3;
  const riffs = await toRiffs(supabase, null, (showToday ? today.data : allTime.data) ?? []);
  const collage = (await toRiffs(supabase, null, allTime.data ?? [])).slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-bold tracking-wider text-brand-strong uppercase dark:bg-brand/15 dark:text-brand">
            A new theme every day
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">
            Your silliest idea. <span className="text-brand">Drawn by AI.</span> Judged by everyone.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Daily Riff is a daily comedy game for Columbia students. Riff on the theme, let AI
            make it real, and fight for the top spot.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login?next=/feed"
              className="rounded-full bg-brand px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-strong"
            >
              Start riffing. It&apos;s free
            </Link>
            <Link
              href="/feed"
              className="rounded-full border border-line bg-surface px-6 py-3.5 font-semibold hover:bg-surface-2"
            >
              Browse today&apos;s riffs
            </Link>
          </div>
        </div>

        {collage.length === 3 && (
          <div className="relative mx-auto hidden aspect-square w-full max-w-md sm:block" aria-hidden="true">
            {collage.map((riff, i) => (
              <figure
                key={riff.id}
                className={`absolute w-[58%] rounded-3xl bg-surface p-2.5 pb-3 shadow-2xl ring-1 ring-line ${
                  ["top-0 left-0 -rotate-6", "top-[12%] right-0 rotate-6", "bottom-0 left-[20%] -rotate-2"][i]
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={riff.imageUrl} alt="" className="aspect-square w-full rounded-2xl object-cover" />
                <figcaption className="mt-2 line-clamp-1 px-1 text-sm font-semibold">{riff.caption}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <div className="mt-14">
        <ThemeHero theme={theme}>
          <SignedOutCta />
        </ThemeHero>
      </div>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="rounded-3xl border border-line bg-surface p-6">
            <p className="text-3xl">{step.emoji}</p>
            <p className="mt-3 text-xs font-bold tracking-wider text-muted uppercase">Step {i + 1}</p>
            <h2 className="mt-1 font-display text-xl font-bold">{step.title}</h2>
            <p className="mt-2 text-muted">{step.body}</p>
          </div>
        ))}
      </section>

      {riffs.length > 0 && (
        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-bold">
              {showToday ? "Today's top riffs" : "Fan favorites"}
            </h2>
            <Link href="/feed" className="text-sm font-semibold text-brand hover:underline">
              See the full feed →
            </Link>
          </div>
          <RiffGrid riffs={riffs} signedIn={false} ranked />
        </section>
      )}
    </main>
  );
}
