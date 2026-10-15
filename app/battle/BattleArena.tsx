"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Riff } from "@/lib/generations";
import SignInPrompt from "@/app/_components/SignInPrompt";
import { judgeMatchup } from "./actions";

type Records = Record<number, { wins: number; losses: number }>;

const winRate = (r?: { wins: number; losses: number }) =>
  r && r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : 0;

export default function BattleArena({
  pair,
  signedIn,
}: {
  pair: [Riff, Riff];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [records, setRecords] = useState<Records | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signInReason, setSignInReason] = useState<string | null>(null);
  const [loadingNext, startNext] = useTransition();

  // Fetches a fresh pair from the server; the page re-renders with new props.
  const next = () => startNext(() => router.refresh());

  async function pick(winner: Riff) {
    if (picked !== null) return;
    if (!signedIn) return setSignInReason("Sign in to pick a winner");
    const loser = pair[0].id === winner.id ? pair[1] : pair[0];
    setPicked(winner.id);
    setError(null);
    const result = await judgeMatchup(winner.id, loser.id);
    if (!result.ok) {
      setPicked(null);
      setError(result.error);
      return;
    }
    setRecords(result.records);
  }

  // After the reveal, move on by itself.
  useEffect(() => {
    if (!records) return;
    const timer = setTimeout(next, 2400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  // ← / → to pick, Enter or Space to skip ahead.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;
      if (picked === null && e.key === "ArrowLeft") pick(pair[0]);
      else if (picked === null && e.key === "ArrowRight") pick(pair[1]);
      else if (records && (e.key === "Enter" || e.key === " ")) next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const [left, right] = pair;
  const winnerRate = picked !== null && records ? winRate(records[picked]) : 0;
  const loserId = picked === left.id ? right.id : left.id;
  const loserRate = records ? winRate(records[loserId]) : 0;
  const verdict =
    winnerRate > loserRate
      ? "You sided with the crowd 👏"
      : winnerRate < loserRate
        ? "Bold pick. The crowd disagrees 🤔"
        : "Dead even. You broke the tie ⚖️";

  return (
    <div>
      <div className="relative grid grid-cols-2 gap-3 sm:gap-6">
        {pair.map((riff, i) => {
          const isPick = picked === riff.id;
          const record = records?.[riff.id];
          return (
            <button
              key={riff.id}
              type="button"
              onClick={() => pick(riff)}
              disabled={picked !== null}
              aria-label={`Pick “${riff.caption}”${i === 0 ? " (left arrow)" : " (right arrow)"}`}
              className={`group flex flex-col overflow-hidden rounded-3xl border bg-surface text-left shadow-sm transition-all duration-300 enabled:hover:-translate-y-1 enabled:hover:shadow-xl ${
                isPick
                  ? "border-brand ring-4 ring-brand"
                  : picked !== null
                    ? "border-line opacity-55 grayscale-[40%]"
                    : "border-line"
              }`}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={riff.imageUrl} alt={riff.caption} className="h-full w-full object-cover" />
                {isPick && (
                  <span className="absolute top-3 left-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white sm:text-sm">
                    Your pick
                  </span>
                )}
                {record && (
                  <div className="absolute inset-x-0 bottom-0 animate-fade-in bg-gradient-to-t from-black/85 to-transparent p-3 pt-10 text-white sm:p-5">
                    <p className="font-display text-3xl font-extrabold sm:text-5xl">{winRate(record)}%</p>
                    <p className="text-xs text-white/80 sm:text-sm">
                      win rate · {record.wins + record.losses} battles
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3 sm:p-5">
                <p className="line-clamp-3 text-sm leading-snug font-semibold sm:text-lg">{riff.caption}</p>
                <p className="truncate text-xs text-muted sm:text-sm">
                  {riff.creator} · “{riff.idea}”
                </p>
              </div>
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[calc(50%-2rem)] left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink font-display text-lg font-extrabold text-bg shadow-lg ring-4 ring-bg sm:h-16 sm:w-16 sm:text-2xl"
        >
          VS
        </span>
      </div>

      <div className="mt-6 flex min-h-20 flex-col items-center gap-3 text-center">
        {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
        {records ? (
          <>
            <p className="animate-fade-in font-display text-xl font-bold">{verdict}</p>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full animate-progress bg-brand" />
            </div>
            <button
              type="button"
              onClick={next}
              disabled={loadingNext}
              className="rounded-full bg-ink px-6 py-2.5 font-semibold text-bg disabled:opacity-60"
            >
              {loadingNext ? "Loading…" : "Next matchup →"}
            </button>
          </>
        ) : (
          <>
            <p className="text-muted">
              Tap the funnier one
              <span className="hidden sm:inline"> (or use ← →)</span>
            </p>
            <button
              type="button"
              onClick={next}
              disabled={loadingNext || picked !== null}
              className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-60"
            >
              {loadingNext ? "Loading…" : "Can't decide? Skip"}
            </button>
          </>
        )}
      </div>

      <SignInPrompt reason={signInReason} onClose={() => setSignInReason(null)} />
    </div>
  );
}
