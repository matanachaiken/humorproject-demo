"use client";

import { useCallback, useState } from "react";
import { castVote } from "@/app/feed/actions";
import type { Riff } from "@/lib/generations";

type Tally = { vote: number; score: number };

// Optimistic voting for a list of riffs. Votes made on this page are kept
// as overrides, so a card and its lightbox always show the same numbers.
export function useVotes({
  signedIn,
  onNeedSignIn,
}: {
  signedIn: boolean;
  onNeedSignIn: () => void;
}) {
  const [overrides, setOverrides] = useState<Record<number, Tally>>({});
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const tally = (riff: Riff): Tally => overrides[riff.id] ?? { vote: riff.myVote, score: riff.score };

  async function vote(riff: Riff, value: 1 | -1) {
    if (!signedIn) return onNeedSignIn();
    if (riff.isMine) {
      setError("That's your riff. Let everyone else decide!");
      return;
    }

    const previous = tally(riff);
    // Tapping your current vote again takes it back.
    const next = previous.vote === value ? 0 : value;
    setOverrides((o) => ({
      ...o,
      [riff.id]: { vote: next, score: previous.score - previous.vote + next },
    }));
    setPending((p) => ({ ...p, [riff.id]: true }));
    setError(null);

    const result = await castVote(riff.id, next);
    setPending((p) => ({ ...p, [riff.id]: false }));
    if (!result.ok) {
      setOverrides((o) => ({ ...o, [riff.id]: previous }));
      setError(result.error);
    }
  }

  return {
    tally,
    vote,
    isPending: (riff: Riff) => Boolean(pending[riff.id]),
    error,
    clearError,
  };
}
