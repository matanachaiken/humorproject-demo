"use client";

import Image from "next/image";
import type { Riff } from "@/lib/generations";
import { STYLES, frameFor } from "@/lib/progression";
import LevelBadge from "./LevelBadge";
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
  const frame = frameFor(riff.creatorLevel);
  const style = riff.style !== "classic" ? STYLES[riff.style] : null;

  return (
    // Level 7+ creators get a gold frame, level 10 a holographic one.
    <div
      className={`flex h-full flex-col rounded-[1.65rem] ${
        frame === "holo" ? "frame-holo p-[3px]" : frame === "gold" ? "frame-gold p-[3px]" : ""
      } ${medal ? `ring-2 ring-offset-2 ring-offset-bg ${medal.ring}` : ""}`}
    >
      <article
        className={`group flex flex-1 flex-col overflow-hidden rounded-3xl bg-surface shadow-sm transition-shadow hover:shadow-md ${
          frame ? "" : "border border-line"
        }`}
      >
        <button
          type="button"
          onClick={onOpen}
          className="relative block aspect-square w-full overflow-hidden bg-surface-2"
          aria-label={`Open “${riff.caption}”`}
        >
          <Image
            src={riff.imageUrl}
            alt={riff.caption}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
          {style && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              {style.emoji} {style.label}
            </span>
          )}
        </button>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <button type="button" onClick={onOpen} className="text-left">
            <p className="line-clamp-2 text-[17px] leading-snug font-semibold">{riff.caption}</p>
            <p className="mt-1 truncate text-sm text-muted">
              {riff.isMine ? "You" : riff.creator} <LevelBadge level={riff.creatorLevel} /> · “
              {riff.idea}”
            </p>
          </button>
          <div className="mt-auto flex items-center justify-between gap-2">
            <VoteButtons score={score} vote={vote} onVote={onVote} disabled={pending} />
            {riff.wins > 0 && (
              <span
                className="text-xs text-muted"
                title={`Each battle win is worth a point · won ${record?.rate}% of ${record?.battles}`}
              >
                ⚡ {riff.wins} battle {riff.wins === 1 ? "win" : "wins"}
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
