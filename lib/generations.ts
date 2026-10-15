import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nyToday } from "@/lib/day";

// Columns signed-out visitors may read (see the week 5 migration).
// Signed-in users also get user_id so we can mark their own images.
const PUBLIC_COLUMNS =
  "id, creator_name, theme_day, theme, user_input, image_prompt, caption, storage_path, created_at, score, wins, losses";

export function generationColumns(signedIn: boolean) {
  return signedIn ? `${PUBLIC_COLUMNS}, user_id` : PUBLIC_COLUMNS;
}

export type GenerationRow = {
  id: number;
  creator_name: string;
  theme_day: string | null;
  theme: string;
  user_input: string;
  image_prompt: string;
  caption: string;
  storage_path: string;
  created_at: string;
  score: number;
  wins: number;
  losses: number;
  user_id?: string;
};

// Everything a card, the lightbox, or a matchup needs. Plain data so it
// can be passed to Client Components.
export type Riff = {
  id: number;
  imageUrl: string;
  caption: string;
  creator: string;
  isMine: boolean;
  idea: string;
  theme: string;
  day: string;
  imagePrompt: string;
  score: number;
  myVote: number;
  wins: number;
  losses: number;
};

export function imageUrl(supabase: SupabaseClient, storagePath: string) {
  return supabase.storage.from("generations").getPublicUrl(storagePath).data.publicUrl;
}

// Adds image URLs and the signed-in user's own votes to a list of rows.
export async function toRiffs(
  supabase: SupabaseClient,
  userId: string | null,
  rows: GenerationRow[]
): Promise<Riff[]> {
  const myVotes = new Map<number, number>();
  if (userId && rows.length) {
    const { data } = await supabase
      .from("generation_votes")
      .select("generation_id, vote")
      .eq("user_id", userId)
      .in(
        "generation_id",
        rows.map((r) => r.id)
      );
    for (const v of data ?? []) myVotes.set(v.generation_id, v.vote);
  }

  return rows.map((r) => ({
    id: r.id,
    imageUrl: imageUrl(supabase, r.storage_path),
    caption: r.caption,
    creator: r.creator_name,
    isMine: Boolean(userId && r.user_id === userId),
    idea: r.user_input,
    theme: r.theme,
    day: r.theme_day ?? nyToday(new Date(r.created_at)),
    imagePrompt: r.image_prompt,
    score: r.score,
    myVote: myVotes.get(r.id) ?? 0,
    wins: r.wins,
    losses: r.losses,
  }));
}

export type DailyWinner = { day: string; theme: string; top: GenerationRow[] };

// The top images of each finished day (today is still in play), newest first.
export async function getDailyWinners(
  supabase: SupabaseClient,
  signedIn: boolean,
  { days = 30, perDay = 3 } = {}
): Promise<DailyWinner[]> {
  const today = nyToday();
  const since = new Date(Date.now() - (days + 1) * 86_400_000).toISOString();
  const { data } = await supabase
    .from("generations")
    .select(generationColumns(signedIn))
    .gt("score", 0)
    .gte("created_at", since)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1000)
    .overrideTypes<GenerationRow[], { merge: false }>();

  const byDay = new Map<string, DailyWinner>();
  for (const row of data ?? []) {
    const day = row.theme_day ?? nyToday(new Date(row.created_at));
    if (day >= today) continue;
    const entry = byDay.get(day) ?? { day, theme: row.theme, top: [] };
    if (entry.top.length < perDay) entry.top.push(row);
    byDay.set(day, entry);
  }
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}
