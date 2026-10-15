"use client";

import { useState } from "react";
import type { Candidate } from "@/lib/writersRoom";
import { voteTheme } from "./actions";

export default function Ballot({
  candidates,
  myVote,
  canVote,
}: {
  candidates: Candidate[];
  myVote: number | null;
  canVote: boolean;
}) {
  const [picked, setPicked] = useState(myVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Count my vote on the client so the bars move immediately.
  const votesFor = (c: Candidate) =>
    c.votes - (myVote === c.id ? 1 : 0) + (picked === c.id ? 1 : 0);
  const total = candidates.reduce((sum, c) => sum + votesFor(c), 0);

  async function vote(id: number) {
    if (!canVote || pending || picked === id) return;
    const previous = picked;
    setPicked(id);
    setPending(true);
    setError(null);
    const result = await voteTheme(id);
    setPending(false);
    if (!result.ok) {
      setPicked(previous);
      setError(result.error);
    }
  }

  return (
    <div>
      <ol className="grid gap-4 md:grid-cols-3">
        {candidates.map((c, i) => {
          const votes = votesFor(c);
          const share = total ? Math.round((votes / total) * 100) : 0;
          const mine = picked === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => vote(c.id)}
                disabled={!canVote}
                aria-pressed={mine}
                className={`flex h-full w-full flex-col gap-4 rounded-3xl border-2 bg-surface p-6 text-left transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg ${
                  mine ? "border-brand shadow-lg shadow-brand/15" : "border-line"
                }`}
              >
                <span className="text-xs font-bold tracking-wider text-muted uppercase">
                  Option {String.fromCharCode(65 + i)}
                </span>
                <span className="font-display text-2xl leading-tight font-extrabold">{c.theme}</span>
                {c.source_title && (
                  <span className="line-clamp-2 text-xs text-muted">From Reddit: {c.source_title}</span>
                )}
                <span className="mt-auto flex flex-col gap-1.5">
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-brand transition-[width] duration-500"
                      style={{ width: `${share}%` }}
                    />
                  </span>
                  <span className="flex justify-between text-sm">
                    <span className={mine ? "font-bold text-brand" : "text-muted"}>
                      {mine ? "✓ Your pick" : canVote ? "Vote for this" : ""}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {votes} {votes === 1 ? "vote" : "votes"}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {error && <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
