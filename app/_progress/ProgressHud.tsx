"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Progress } from "@/lib/auth";
import {
  LEVELS,
  PRIZES,
  describeUnlock,
  levelInfo,
  visitXp,
  type PrizeId,
} from "@/lib/progression";
import { announceXp, onXp } from "@/lib/xpEvents";
import Modal from "@/app/_components/Modal";
import { ackLevel, spinWheel } from "./actions";
import Wheel, { rotationFor } from "./Wheel";

const dismissKey = (day: string) => `dr_wheel_dismissed_${day}`;

export default function ProgressHud({ progress, today }: { progress: Progress; today: string }) {
  const router = useRouter();

  // XP from the server, kept current by XP events from actions between refreshes.
  const [serverXp, setServerXp] = useState(progress.xp);
  const [xp, setXp] = useState(progress.xp);
  if (progress.xp !== serverXp) {
    setServerXp(progress.xp);
    setXp(progress.xp);
  }
  const [gain, setGain] = useState<{ amount: number; key: number } | null>(null);
  const xpRef = useRef(xp);
  useEffect(() => {
    xpRef.current = xp;
  }, [xp]);

  useEffect(
    () =>
      onXp((next) => {
        if (next > xpRef.current) setGain({ amount: next - xpRef.current, key: Date.now() });
        xpRef.current = next;
        setXp(next);
      }),
    []
  );

  useEffect(() => {
    if (!gain) return;
    const timer = setTimeout(() => setGain(null), 1800);
    return () => clearTimeout(timer);
  }, [gain]);

  // Daily check-in + wheel: pops up once on the first visit of the day.
  // `popupsReady` holds back the level-up screen until we know whether the
  // wheel goes first, so the two never flash over each other.
  const [wheelOpen, setWheelOpen] = useState(false);
  const [popupsReady, setPopupsReady] = useState(false);
  useEffect(() => {
    let dismissed = progress.spunToday;
    try {
      dismissed ||= sessionStorage.getItem(dismissKey(today)) === "1";
    } catch {}
    const timer = setTimeout(() => {
      if (!dismissed) setWheelOpen(true);
      setPopupsReady(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [progress.spunToday, today]);

  function closeWheel() {
    setWheelOpen(false);
    try {
      sessionStorage.setItem(dismissKey(today), "1");
    } catch {}
  }

  // Level-ups from any source (including upvotes while you were away).
  const [seenLevel, setSeenLevel] = useState(progress.seenLevel);
  const info = levelInfo(xp);
  const levelUp = popupsReady && !wheelOpen && info.level > seenLevel;

  function closeLevelUp() {
    setSeenLevel(info.level);
    ackLevel(info.level);
  }

  return (
    <>
      <div className="flex items-center gap-1.5 text-sm sm:gap-2">
        <span
          className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 font-bold text-orange-700 tabular-nums dark:bg-orange-500/15 dark:text-orange-300"
          title={`${progress.streak}-day streak${progress.streakFreezes ? ` · ${progress.streakFreezes} streak freeze${progress.streakFreezes > 1 ? "s" : ""}` : ""}`}
        >
          🔥 {progress.streak}
          {progress.streakFreezes > 0 && <span className="text-xs">🧊</span>}
        </span>

        <Link
          href="/me"
          className="relative flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-1 hover:bg-line"
          title={info.next ? `${info.xp} XP · ${info.toNext} XP to level ${info.next.level}` : `${info.xp} XP · max level`}
        >
          <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-bg">Lv {info.level}</span>
          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-line sm:block">
            <span
              className="block h-full rounded-full bg-brand transition-[width] duration-700"
              style={{ width: `${Math.round(info.progress * 100)}%` }}
            />
          </span>
          {gain && (
            <span
              key={gain.key}
              className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 animate-float-up rounded-full bg-brand px-2 py-0.5 text-xs font-bold whitespace-nowrap text-white"
            >
              +{gain.amount} XP
            </span>
          )}
        </Link>

        {!progress.spunToday && (
          <button
            type="button"
            onClick={() => setWheelOpen(true)}
            className="hidden animate-pulse rounded-full bg-brand-soft px-2.5 py-1 font-bold text-brand-strong sm:block dark:bg-brand/15 dark:text-brand"
            aria-label="Spin today's mystery wheel"
          >
            🎡
          </button>
        )}
      </div>

      <DailyWheel
        open={wheelOpen}
        streak={progress.streak}
        onClose={() => {
          closeWheel();
          router.refresh();
        }}
      />

      <Modal open={levelUp} onClose={closeLevelUp} label="Level up" className="w-[min(26rem,calc(100vw-2rem))]">
        <LevelUpContent from={seenLevel} to={info.level} onClose={closeLevelUp} />
      </Modal>
    </>
  );
}

function DailyWheel({ open, streak, onClose }: { open: boolean; streak: number; onClose: () => void }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<PrizeId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    setSpinning(true);
    setError(null);
    const result = await spinWheel();
    if (!result.ok) {
      setSpinning(false);
      setError(result.error);
      return;
    }
    setRotation(rotationFor(result.prize));
    // Reveal once the wheel stops (matches the 4s transition).
    setTimeout(() => {
      setSpinning(false);
      setPrize(result.prize);
      announceXp(result.xp);
    }, 4100);
  }

  const won = PRIZES.find((p) => p.id === prize);

  return (
    <Modal open={open} onClose={() => !spinning && onClose()} label="Daily check-in" className="w-[min(26rem,calc(100vw-2rem))]">
      <div className="flex flex-col items-center gap-5 p-6 text-center sm:p-8">
        <div>
          <p className="text-4xl">🔥</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold">
            {streak > 1 ? `${streak}-day streak!` : "Welcome back!"}
          </h2>
          <p className="text-sm text-muted">
            +{visitXp(streak)} XP for showing up today
            {streak < 7 && ` · come back tomorrow for +${visitXp(streak + 1)}`}
          </p>
        </div>

        <Wheel rotation={rotation} />

        {won ? (
          <div className="animate-fade-in">
            <p className="text-xs font-bold tracking-wider text-brand uppercase">You won</p>
            <p className="font-display text-3xl font-extrabold">{won.label}</p>
            <p className="mt-1 text-sm text-muted">
              {won.id === "freeze"
                ? "Miss a day and your streak survives."
                : won.id === "creation"
                  ? "You can make one more riff today."
                  : "Added to your XP."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-full bg-ink px-6 py-2.5 font-semibold text-bg"
            >
              Nice!
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={spin}
              disabled={spinning}
              className="rounded-full bg-brand px-8 py-3 text-lg font-bold text-white shadow-lg shadow-brand/30 hover:bg-brand-strong disabled:opacity-70"
            >
              {spinning ? "Spinning…" : "🎡 Spin the wheel"}
            </button>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted">
              {PRIZES.map((p) => (
                <li key={p.id} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  {p.label} {Math.round(p.chance * 100)}%
                </li>
              ))}
            </ul>
            {!spinning && (
              <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
                Spin later
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function LevelUpContent({ from, to, onClose }: { from: number; to: number; onClose: () => void }) {
  const reached = LEVELS.find((l) => l.level === to)!;
  const gained = LEVELS.filter((l) => l.level > from && l.level <= to).map((l) => l.unlock);
  const unlocks = gained.map(describeUnlock);
  // After a multi-level jump, point at the biggest unlock.
  const cta = gained.some((u) => u.kind === "room")
    ? { href: "/writers-room", label: "Open the Writers' Room" }
    : gained.some((u) => u.kind === "style")
      ? { href: "/feed", label: "Try your new style" }
      : null;

  return (
    <div className="relative overflow-hidden p-8 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,90,31,0.35),transparent_60%)]"
      />
      <div className="relative">
        <p className="text-5xl">🎉</p>
        <p className="mt-2 text-xs font-bold tracking-widest text-brand uppercase">Level up!</p>
        <h2 className="mt-1 font-display text-4xl font-extrabold">Level {to}</h2>
        <p className="text-lg font-semibold text-muted">{reached.title}</p>
        <div className="mt-6 rounded-2xl bg-surface-2 p-4 text-left">
          <p className="text-xs font-bold tracking-wider text-muted uppercase">Unlocked</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {unlocks.map((u) => (
              <li key={u.label} className="font-semibold">
                {u.emoji} {u.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2">
          {cta && (
            <Link
              href={cta.href}
              onClick={onClose}
              className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong"
            >
              {cta.label} →
            </Link>
          )}
          <button type="button" onClick={onClose} className="text-sm font-medium text-muted hover:text-ink">
            {cta ? "Later" : "Nice!"}
          </button>
        </div>
      </div>
    </div>
  );
}
