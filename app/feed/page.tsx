import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import { DAILY_LIMIT } from "@/lib/ai";
import { getTodaysTheme } from "@/lib/theme";
import { nyDayStart } from "@/lib/day";
import GenerateForm from "./GenerateForm";
import VoteButtons from "./VoteButtons";

// Gemini + Flux can take a while; this also applies to the page's Server Actions.
export const maxDuration = 60;

type Generation = {
  id: number;
  user_id: string;
  creator_name: string;
  theme: string;
  user_input: string;
  image_prompt: string;
  caption: string;
  storage_path: string;
  created_at: string;
  generation_votes: { vote: number; user_id: string }[];
};

const TABS = {
  today: "Today's top",
  new: "Newest",
  all: "All-time top",
} as const;
type Tab = keyof typeof TABS;

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { supabase, user } = await requireCompleteProfile();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = typeof tabParam === "string" && tabParam in TABS ? (tabParam as Tab) : "today";
  const dayStart = nyDayStart();

  const theme = await getTodaysTheme();

  const { count: usedToday } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", dayStart);

  let query = supabase
    .from("generations")
    .select(
      "id, user_id, creator_name, theme, user_input, image_prompt, caption, storage_path, created_at, generation_votes(vote, user_id)"
    )
    .order("created_at", { ascending: false });
  if (tab === "today") query = query.gte("created_at", dayStart);
  const { data, error } = await query
    .limit(tab === "new" ? 50 : 500)
    .overrideTypes<Generation[], { merge: false }>();

  const scored = (data ?? []).map((g) => ({
    ...g,
    score: g.generation_votes.reduce((sum, v) => sum + v.vote, 0),
    myVote: g.generation_votes.find((v) => v.user_id === user.id)?.vote ?? 0,
  }));
  const items =
    tab === "new"
      ? scored
      : scored.sort((a, b) => b.score - a.score).slice(0, 50);

  // The bucket is private, so each image gets a short-lived signed URL.
  const { data: signed } = items.length
    ? await supabase.storage
        .from("generations")
        .createSignedUrls(
          items.map((g) => g.storage_path),
          60 * 60
        )
    : { data: [] };
  const urlFor = new Map<string, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) urlFor.set(s.path, s.signedUrl);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Today&apos;s theme
        </p>
        <h1 className="mt-1 text-3xl font-bold">{theme.theme}</h1>
        {theme.source_title && theme.source_url && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Inspired by Reddit:{" "}
            <a
              href={theme.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-black dark:hover:text-zinc-50"
            >
              {theme.source_title}
            </a>
          </p>
        )}
        <div className="mt-6">
          <GenerateForm
            remaining={Math.max(0, DAILY_LIMIT - (usedToday ?? 0))}
            limit={DAILY_LIMIT}
          />
        </div>
      </section>

      <nav className="mt-10 flex gap-2 text-sm">
        {(Object.keys(TABS) as Tab[]).map((key) => (
          <Link
            key={key}
            href={key === "today" ? "/feed" : `/feed?tab=${key}`}
            className={`rounded-full border px-4 py-1.5 ${
              tab === key
                ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            }`}
          >
            {TABS[key]}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Couldn&apos;t load the feed: {error.message}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed p-8 text-center text-zinc-600 dark:text-zinc-400">
          {tab === "today"
            ? "Nothing yet today. Be the first to riff on the theme!"
            : "No images yet. Create the first one above."}
        </p>
      ) : (
        <ul className="mt-6 space-y-8">
          {items.map((g, i) => (
            <li
              key={g.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
            >
              {urlFor.get(g.storage_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlFor.get(g.storage_path)}
                  alt={g.caption}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-zinc-100 text-zinc-500 dark:bg-zinc-900">
                  Image unavailable
                </div>
              )}
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-lg font-semibold">
                    {tab !== "new" && i < 3 && g.score > 0 && (
                      <span className="mr-2">{["🥇", "🥈", "🥉"][i]}</span>
                    )}
                    {g.caption}
                  </p>
                  <VoteButtons
                    generationId={g.id}
                    initialScore={g.score}
                    initialVote={g.myVote}
                  />
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {g.user_id === user.id ? "You" : g.creator_name} asked for &ldquo;
                  {g.user_input}&rdquo;
                  {tab !== "today" && <> &middot; {g.theme}</>}
                </p>
                <details className="text-sm text-zinc-600 dark:text-zinc-400">
                  <summary className="cursor-pointer select-none">AI prompt</summary>
                  <p className="mt-2 whitespace-pre-wrap">{g.image_prompt}</p>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
