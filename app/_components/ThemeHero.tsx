import Link from "next/link";
import type { DailyTheme } from "@/lib/theme";
import { formatDay, nyNextDayStart } from "@/lib/day";
import Countdown from "./Countdown";

// Today's theme, front and center. Always dark so the theme pops in both
// light and dark mode.
export default function ThemeHero({
  theme,
  children,
}: {
  theme: DailyTheme;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#1c1714] p-6 text-white shadow-xl sm:p-10 dark:ring-1 dark:ring-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(255,90,31,0.55),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(168,85,247,0.3),transparent_40%)]"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <span className="rounded-full bg-white/15 px-3 py-1">
            Today&apos;s theme · {formatDay(theme.day)}
          </span>
          <span className="rounded-full bg-brand/90 px-3 py-1 tabular-nums">
            ⏱ <Countdown until={nyNextDayStart()} />
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
          {theme.theme}
        </h1>
        {theme.writers_room && (
          <p className="mt-3 text-sm font-semibold text-white/90">
            🎬 Picked by the{" "}
            <Link href="/writers-room" className="underline underline-offset-4 hover:text-white">
              Writers&apos; Room
            </Link>
          </p>
        )}
        {theme.source_title && theme.source_url && (
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            Inspired by Reddit:{" "}
            <a
              href={theme.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-white"
            >
              {theme.source_title}
            </a>
          </p>
        )}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function SignedOutCta({ next = "/feed" }: { next?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-strong"
      >
        Sign in to make yours →
      </Link>
      <span className="text-sm text-white/70">
        Type an idea · AI draws it · everyone votes
      </span>
    </div>
  );
}
