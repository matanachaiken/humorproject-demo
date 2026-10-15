"use client";

import type { Riff } from "@/lib/generations";
import VoteButtons from "./VoteButtons";

export const MEDALS = [
  { label: "1st", emoji: "🥇", ring: "ring-amber-400" },
  { label: "2nd", emoji: "🥈", ring: "ring-zinc-300 dark:ring-zinc-500" },
  { label: "3rd", emoji: "🥉", ring: "ring-orange-300 dark:ring-orange-700" },
];

// Head-to-head results from "Which is funnier?", or null if it hasn't battled yet.
export function battleRecord(riff: Pick<Riff, "wins" | "losses">) {
  const total = riff.wins + riff.losses;
  if (!total) return null;
  return {
    rate: Math.round((riff.wins / total) * 100),
    battles: `${total} ${total === 1 ? "battle" : "battles"}`,
  };
}

export default function RiffCard({
  riff,
  rank,
  score,
  vote,
  pending,
  onVote,
  onOpen,
}: {
  riff: Riff;
  rank?: number;
  score: number;
  vote: number;
  pending: boolean;
  onVote: (value: 1 | -1) => void;
  onOpen: () => void;
}) {
  const medal = rank !== undefined ? MEDALS[rank] : undefined;
  const record = battleRecord(riff);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md ${
        medal ? `ring-2 ${medal.ring}` : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-square w-full overflow-hidden bg-surface-2"
        aria-label={`Open “${riff.caption}”`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={riff.imageUrl}
          alt={riff.caption}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {medal && (
          <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
            {medal.emoji} {medal.label}
          </span>
        )}
        {riff.isMine && (
          <span className="absolute top-3 right-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
            Yours
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <button type="button" onClick={onOpen} className="text-left">
          <p className="line-clamp-2 text-[17px] leading-snug font-semibold">{riff.caption}</p>
          <p className="mt-1 truncate text-sm text-muted">
            {riff.isMine ? "You" : riff.creator} · “{riff.idea}”
          </p>
        </button>
        <div className="mt-auto flex items-center justify-between gap-2">
          <VoteButtons score={score} vote={vote} onVote={onVote} disabled={pending} />
          {record && (
            <span className="text-xs text-muted" title={`Won ${record.rate}% of ${record.battles}`}>
              ⚡ {record.rate}% wins
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
