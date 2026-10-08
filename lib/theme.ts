import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCE, generateJson } from "@/lib/ai";
import { nyToday } from "@/lib/day";

export type DailyTheme = {
  day: string;
  theme: string;
  source_title: string | null;
  source_url: string | null;
};

const SUBREDDITS = ["nyc", "AskNYC", "Columbia", "college"];

// Used only when both Reddit and Gemini are unavailable.
const FALLBACK_THEMES = [
  "Midwest kid rides the subway for the first time",
  "Your RA as a Renaissance painting",
  "Pigeons running Wall Street",
  "Dining hall food, but make it Michelin",
  "The $19 bagel",
  "Butler Library at 4am",
  "Your roommate's 3am snack",
  "Midterm season survival mode",
  "A halal cart as a fine-dining experience",
  "Explaining 'ope' to New Yorkers",
  "Rats with better apartments than you",
  "The Low Steps on the first warm day",
];

type RedditPost = { title: string; url: string; subreddit: string };

// Top posts of the day from a few subreddits, via Reddit's public RSS feed.
// One combined request, because Reddit rate-limits back-to-back calls.
async function fetchTrendingPosts(): Promise<RedditPost[]> {
  const res = await fetch(
    `https://www.reddit.com/r/${SUBREDDITS.join("+")}/top/.rss?t=day&limit=25`,
    {
      headers: { "User-Agent": "humorproject-demo/1.0 (Columbia class project)" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!res.ok) throw new Error(`Reddit RSS ${res.status}`);

  const xml = await res.text();
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, entry]) => ({
      title: decode(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      url: entry.match(/<link href="([^"]+)"/)?.[1] ?? "",
      subreddit: entry.match(/<category term="([^"]+)"/)?.[1] ?? "",
    }))
    .filter((post) => post.title && post.url);
}

const themeSchema = {
  type: "object",
  properties: {
    theme: { type: "string" },
    source_index: { type: "integer" },
  },
  required: ["theme", "source_index"],
};

function themeFromPostsPrompt(day: string, posts: RedditPost[]) {
  const list = posts
    .map((post, i) => `${i}. [r/${post.subreddit}] ${post.title}`)
    .join("\n");
  return `You pick the daily theme for a humor site where users create funny AI images.
${AUDIENCE}

Today is ${day}. Here are today's top Reddit posts:
${list}

Pick ONE post that is lighthearted and would inspire funny images. Never pick posts \
about death, injury, crime, violence, tragedy, politics, or real private individuals; \
skip them even if they are popular.
Turn it into a short, playful theme (max 60 characters) that users can riff on. \
Don't name real people. Return the theme and the index of the post you used. \
If no post is suitable, invent a fitting theme yourself and use source_index -1.`;
}

function inventedThemePrompt(day: string) {
  return `You pick the daily theme for a humor site where users create funny AI images.
${AUDIENCE}

Today is ${day}. Invent a short, playful theme (max 60 characters) that fits this time \
of year in New York and in the college semester. Return it with source_index -1.`;
}

type PickedTheme = DailyTheme & { llm_prompt: string | null; text_model: string | null };

async function pickTheme(day: string): Promise<PickedTheme> {
  let posts: RedditPost[] = [];
  try {
    posts = await fetchTrendingPosts();
  } catch (error) {
    console.warn("Couldn't fetch Reddit posts, inventing a theme instead:", error);
  }

  const prompt = posts.length ? themeFromPostsPrompt(day, posts) : inventedThemePrompt(day);
  try {
    const { result, model } = await generateJson<{ theme: string; source_index: number }>(
      prompt,
      themeSchema
    );
    const source = posts[result.source_index];
    return {
      day,
      theme: result.theme.trim().slice(0, 80),
      source_title: source?.title ?? null,
      source_url: source?.url ?? null,
      llm_prompt: prompt,
      text_model: model,
    };
  } catch (error) {
    console.warn("Couldn't generate a theme, using the fallback list:", error);
    const dayNumber = Math.floor(Date.parse(day) / 86_400_000);
    return {
      day,
      theme: FALLBACK_THEMES[dayNumber % FALLBACK_THEMES.length],
      source_title: null,
      source_url: null,
      llm_prompt: null,
      text_model: null,
    };
  }
}

// Today's theme. The first visit of the day picks it and saves it, so
// everyone sees the same theme all day.
export async function getTodaysTheme(): Promise<DailyTheme> {
  const day = nyToday();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("daily_themes")
    .select("day, theme, source_title, source_url")
    .eq("day", day)
    .maybeSingle<DailyTheme>();
  if (existing) return existing;

  const picked = await pickTheme(day);
  const admin = createAdminClient();
  if (!admin) return picked;

  // If two visitors race, the first insert wins and both read it back.
  await admin.from("daily_themes").upsert(picked, { onConflict: "day", ignoreDuplicates: true });
  const { data: saved } = await admin
    .from("daily_themes")
    .select("day, theme, source_title, source_url")
    .eq("day", day)
    .single<DailyTheme>();
  return saved ?? picked;
}
