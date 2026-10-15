import "server-only";
import type { GenerationRow } from "@/lib/generations";

const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// Picks a random pair the user hasn't judged yet, preferring two riffs on
// the same theme so the comparison is fair. Returns null when none are left.
export function pickPair(
  candidates: GenerationRow[],
  judged: { winner_id: number; loser_id: number }[]
): [GenerationRow, GenerationRow] | null {
  const seen = new Set(judged.map((m) => pairKey(m.winner_id, m.loser_id)));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  let fallback: [GenerationRow, GenerationRow] | null = null;
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      const [a, b] = [shuffled[i], shuffled[j]];
      if (seen.has(pairKey(a.id, b.id))) continue;
      if (a.theme === b.theme) return [a, b];
      fallback ??= [a, b];
    }
  }
  return fallback;
}
