"use client";

import Link from "next/link";
import type { Riff } from "@/lib/generations";
import { STYLES } from "@/lib/progression";
import LevelBadge from "./LevelBadge";
import { battleRecord } from "./RiffCard";
import ShareButton from "./ShareButton";
import VoteButtons from "./VoteButtons";

// The full view of one riff: used in the feed lightbox and on /g/[id].
export default function RiffDetails({
  riff,
  dayLabel,
  score,
  vote,
  pending,
  onVote,
  showPageLink = false,
}: {
  riff: Riff;
  dayLabel: string;
  score: number;
  vote: number;
  pending: boolean;
  onVote: (value: 1 | -1) => void;
  showPageLink?: boolean;
}) {
  const record = battleRecord(riff);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold tracking-wider text-brand uppercase">
          {dayLabel} · {riff.theme}
        </p>
        <h2 className="mt-2 font-display text-2xl leading-tight font-bold sm:text-3xl">
          {riff.caption}
        </h2>
        <p className="mt-2 text-muted">
          <span className="font-medium text-ink">{riff.isMine ? "You" : riff.creator}</span>{" "}
          <LevelBadge level={riff.creatorLevel} /> asked for “{riff.idea}”
          {riff.style !== "classic" && (
            <>
              {" "}
              in {STYLES[riff.style].emoji} {STYLES[riff.style].label}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <VoteButtons score={score} vote={vote} onVote={onVote} disabled={pending} size="lg" />
          {/* Points = vote score + battle wins (see lib/generations.ts). */}
          <span className="text-xs text-muted tabular-nums">
            {score} {score === 1 ? "point" : "points"}: {score - riff.wins} from votes + {riff.wins}{" "}
            from battles
          </span>
        </div>
        <ShareButton id={riff.id} caption={riff.caption} />
        {showPageLink && (
          <Link href={`/g/${riff.id}`} className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
            Open page
          </Link>
        )}
      </div>

      {record && (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          ⚡ Won <span className="font-semibold">{record.rate}%</span> of {record.battles} in{" "}
          <Link href="/battle" className="underline underline-offset-4">
            Which is funnier?
          </Link>
        </p>
      )}

      <details className="group rounded-2xl border border-line px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium select-none">
          How the AI drew this
        </summary>
        <p className="mt-2 leading-relaxed whitespace-pre-wrap text-muted">{riff.imagePrompt}</p>
      </details>
    </div>
  );
}
