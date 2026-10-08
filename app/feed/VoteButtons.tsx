"use client";

import { useState, useTransition } from "react";
import { castVote } from "./actions";

export default function VoteButtons({
  generationId,
  initialScore,
  initialVote,
}: {
  generationId: number;
  initialScore: number;
  initialVote: number;
}) {
  const [vote, setVote] = useState(initialVote);
  const [score, setScore] = useState(initialScore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(value: 1 | -1) {
    // Tapping your current vote again takes it back.
    const next = vote === value ? 0 : value;
    const previous = { vote, score };

    // Update right away; roll back if the server says no.
    setVote(next);
    setScore(score - vote + next);
    setError(null);
    startTransition(async () => {
      const result = await castVote(generationId, next);
      if (!result.ok) {
        setVote(previous.vote);
        setScore(previous.score);
        setError(result.error);
      }
    });
  }

  const base =
    "flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-colors disabled:opacity-60";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={vote === 1}
        disabled={pending}
        onClick={() => choose(1)}
        className={`${base} ${
          vote === 1
            ? "border-orange-500 bg-orange-500 text-white"
            : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        }`}
      >
        ▲
      </button>
      <span className="min-w-8 text-center font-semibold tabular-nums">{score}</span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={vote === -1}
        disabled={pending}
        onClick={() => choose(-1)}
        className={`${base} ${
          vote === -1
            ? "border-indigo-500 bg-indigo-500 text-white"
            : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        }`}
      >
        ▼
      </button>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
