"use client";

import { useState } from "react";

export default function VoteButtons({
  score,
  vote,
  onVote,
  disabled = false,
  size = "md",
}: {
  score: number;
  vote: number;
  onVote: (value: 1 | -1) => void;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  // Bumped on every upvote so the "+1" and the pop animation replay.
  const [burst, setBurst] = useState(0);

  function choose(value: 1 | -1) {
    if (value === 1 && vote !== 1) setBurst((b) => b + 1);
    onVote(value);
  }

  const button = size === "lg" ? "h-11 w-11 text-lg" : "h-9 w-9 text-base";

  return (
    <div className="relative inline-flex items-center rounded-full border border-line bg-surface p-0.5">
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={vote === 1}
        disabled={disabled}
        onClick={() => choose(1)}
        className={`${button} flex items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
          vote === 1 ? "bg-brand text-white" : "text-muted hover:bg-brand-soft hover:text-brand-strong"
        }`}
      >
        <span key={burst} className={burst ? "animate-pop" : undefined}>
          ▲
        </span>
      </button>
      <span
        className={`min-w-9 text-center font-bold tabular-nums ${size === "lg" ? "text-lg" : ""} ${
          vote === 1 ? "text-brand-strong" : vote === -1 ? "text-indigo-500" : ""
        }`}
        aria-label={`${score} points`}
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={vote === -1}
        disabled={disabled}
        onClick={() => choose(-1)}
        className={`${button} flex items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
          vote === -1 ? "bg-indigo-500 text-white" : "text-muted hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-950"
        }`}
      >
        ▼
      </button>
      {burst > 0 && vote === 1 && (
        <span
          key={burst}
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 left-2 animate-float-up text-sm font-bold text-brand"
        >
          +1
        </span>
      )}
    </div>
  );
}
