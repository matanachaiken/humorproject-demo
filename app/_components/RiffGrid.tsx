"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatDay } from "@/lib/day";
import type { Riff } from "@/lib/generations";
import Modal from "./Modal";
import RiffCard from "./RiffCard";
import RiffDetails from "./RiffDetails";
import SignInPrompt from "./SignInPrompt";
import { useVotes } from "./useVotes";

export default function RiffGrid({
  riffs,
  signedIn,
  ranked = false,
  podium = false,
}: {
  riffs: Riff[];
  signedIn: boolean;
  // Medals on the first three (when they have points).
  ranked?: boolean;
  // Also split the top three into their own row above everything else.
  podium?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [signInReason, setSignInReason] = useState<string | null>(null);
  const votes = useVotes({ signedIn, onNeedSignIn: () => setSignInReason("Sign in to vote") });

  const medalCount = ranked ? riffs.slice(0, 3).filter((r) => r.score > 0).length : 0;
  const podiumCount = podium ? medalCount : 0;
  const open = openIndex === null ? null : riffs[openIndex];

  const step = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + riffs.length) % riffs.length));

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!votes.error) return;
    const timer = setTimeout(votes.clearError, 3500);
    return () => clearTimeout(timer);
  }, [votes.error, votes.clearError]);

  const card = (riff: Riff, index: number) => {
    const { vote, score } = votes.tally(riff);
    return (
      <li key={riff.id} className="animate-fade-in">
        <RiffCard
          riff={riff}
          rank={index < medalCount ? index : undefined}
          score={score}
          vote={vote}
          pending={votes.isPending(riff)}
          onVote={(value) => votes.vote(riff, value)}
          onOpen={() => setOpenIndex(index)}
        />
      </li>
    );
  };

  return (
    <>
      {podiumCount > 0 && (
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Top three">
          {riffs.slice(0, podiumCount).map(card)}
        </ol>
      )}
      {podiumCount > 0 && riffs.length > podiumCount && (
        <h3 className="mt-12 mb-5 font-display text-xl font-bold">The rest of the pack</h3>
      )}
      {riffs.length > podiumCount && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {riffs.slice(podiumCount).map((riff, i) => card(riff, i + podiumCount))}
        </ul>
      )}

      <Modal
        open={open !== null}
        onClose={() => setOpenIndex(null)}
        label={open?.caption ?? "Riff"}
        className="w-[min(64rem,calc(100vw-1.5rem))]"
      >
        {open && (
          <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="relative bg-black">
              <Image
                src={open.imageUrl}
                alt={open.caption}
                width={1024}
                height={1024}
                sizes="(min-width: 768px) 560px, 100vw"
                loading="eager"
                className="aspect-square w-full object-contain"
              />
              {riffs.length > 1 && (
                <>
                  <NavArrow direction="prev" onClick={() => step(-1)} />
                  <NavArrow direction="next" onClick={() => step(1)} />
                </>
              )}
            </div>
            <div className="relative p-6 sm:p-8">
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close"
                className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted hover:bg-surface-2 hover:text-ink"
              >
                ×
              </button>
              <RiffDetails
                riff={open}
                dayLabel={formatDay(open.day)}
                {...votes.tally(open)}
                pending={votes.isPending(open)}
                onVote={(value) => votes.vote(open, value)}
                showPageLink
              />
            </div>
          </div>
        )}
      </Modal>

      <SignInPrompt reason={signInReason} onClose={() => setSignInReason(null)} />

      {votes.error && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm animate-fade-in rounded-2xl bg-ink px-4 py-3 text-center text-sm font-medium text-bg shadow-lg lg:bottom-6"
        >
          {votes.error}
        </p>
      )}
    </>
  );
}

function NavArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous riff" : "Next riff"}
      className={`absolute top-1/2 -translate-y-1/2 ${
        direction === "prev" ? "left-3" : "right-3"
      } flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-xl text-white backdrop-blur hover:bg-black/75`}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
