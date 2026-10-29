import "server-only";
import { cache } from "react";
import { AUDIENCE, generateJson } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChain, render, step } from "@/lib/pipeline";
import { fetchTrendingPosts, postList, type RedditPost } from "@/lib/theme";

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
    const chain = await getChain("writers_room");
    const draft = step(chain, 1);
    const prompt = render(draft.template, {
      audience: AUDIENCE,
      day: forDay,
      posts_block: posts.length ? `Here are today's top Reddit posts:\n${postList(posts)}` : "",
      source_rule: posts.length
        ? "Base each on a lighthearted post and return its index, or invent one and use source_index -1."
        : "Use source_index -1.",
    });
    const { result } = await generateJson<{ themes: { theme: string; source_index: number }[] }>(
      prompt,
      candidatesSchema,
      { chainId: chain.id, stepId: draft.id }
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
