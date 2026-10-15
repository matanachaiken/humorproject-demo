import "server-only";
import { cache } from "react";
import { AUDIENCE, generateJson } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTrendingPosts, type RedditPost } from "@/lib/theme";

export type Candidate = {
  id: number;
  for_day: string;
  theme: string;
  source_title: string | null;
  source_url: string | null;
  votes: number;
};

const candidatesSchema = {
  type: "object",
  properties: {
    themes: {
      type: "array",
      items: {
        type: "object",
        properties: { theme: { type: "string" }, source_index: { type: "integer" } },
        required: ["theme", "source_index"],
      },
    },
  },
  required: ["themes"],
};

function candidatesPrompt(day: string, posts: RedditPost[]) {
  const list = posts.map((post, i) => `${i}. [r/${post.subreddit}] ${post.title}`).join("\n");
  return `You draft options for tomorrow's theme on a humor site where users create funny AI images.
${AUDIENCE}

Tomorrow is ${day}. ${posts.length ? `Here are today's top Reddit posts:\n${list}` : ""}

Write THREE different short, playful themes (max 60 characters each) that users could riff on.
Make them clearly different from each other (e.g. one about campus, one about the city, one wildcard).
${posts.length ? "Base each on a lighthearted post and return its index, or invent one and use source_index -1." : "Use source_index -1."}
Never use posts about death, injury, crime, violence, tragedy, politics, or real private individuals.
Don't name real people.`;
}

const SELECT = "id, for_day, theme, source_title, source_url, votes";

// Tomorrow's three candidates, drafting them with AI the first time.
export const ensureCandidates = cache(async (forDay: string): Promise<Candidate[]> => {
  const admin = createAdminClient();
  if (!admin) return [];

  const read = () =>
    admin
      .from("theme_candidates")
      .select(SELECT)
      .eq("for_day", forDay)
      .order("id")
      .limit(3)
      .overrideTypes<Candidate[], { merge: false }>();

  const { data: existing } = await read();
  if (existing && existing.length >= 3) return existing;

  let posts: RedditPost[] = [];
  try {
    posts = await fetchTrendingPosts();
  } catch (error) {
    console.warn("Writers' Room: no Reddit posts, inventing themes:", error);
  }

  let drafts: { theme: string; source_title: string | null; source_url: string | null }[];
  try {
    const { result } = await generateJson<{ themes: { theme: string; source_index: number }[] }>(
      candidatesPrompt(forDay, posts),
      candidatesSchema
    );
    drafts = result.themes.slice(0, 3).map((t) => ({
      theme: t.theme.trim().slice(0, 80),
      source_title: posts[t.source_index]?.title ?? null,
      source_url: posts[t.source_index]?.url ?? null,
    }));
  } catch (error) {
    // Save nothing, so the next visit tries again instead of locking in
    // tomorrow's ballot while the AI is down. The page shows "still drafting".
    console.warn("Writers' Room: AI drafting failed, will retry:", error);
    return existing ?? [];
  }

  await admin
    .from("theme_candidates")
    .upsert(
      drafts.filter((d) => d.theme).map((d) => ({ ...d, for_day: forDay })),
      { onConflict: "for_day,theme", ignoreDuplicates: true }
    );
  const { data } = await read();
  return data ?? [];
});
