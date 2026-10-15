import "server-only";
import type { GenerationRow } from "@/lib/generations";

const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// Picks a random pair the user hasn't judged today. Battle wins are worth
// points, so it prefers two of today's riffs (deciding today's champion),
// then two on the same theme, then any pair. Returns null when none are left.
export function pickPair(
  candidates: GenerationRow[],
  judged: { winner_id: number; loser_id: number }[],
  today: string
): [GenerationRow, GenerationRow] | null {
  const seen = new Set(judged.map((m) => pairKey(m.winner_id, m.loser_id)));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  let sameTheme: [GenerationRow, GenerationRow] | null = null;
  let anyPair: [GenerationRow, GenerationRow] | null = null;
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      const [a, b] = [shuffled[i], shuffled[j]];
      if (seen.has(pairKey(a.id, b.id))) continue;
      if (a.theme_day === today && b.theme_day === today) return [a, b];
      if (a.theme === b.theme) sameTheme ??= [a, b];
      anyPair ??= [a, b];
    }
  }
  return sameTheme ?? anyPair;
}
