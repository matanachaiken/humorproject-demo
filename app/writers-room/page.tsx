import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { formatDay, nyNextDayStart, nyToday } from "@/lib/day";
import { LEVELS, WRITERS_ROOM_LEVEL, levelInfo } from "@/lib/progression";
import { ensureCandidates } from "@/lib/writersRoom";
import Countdown from "@/app/_components/Countdown";
import Ballot from "./Ballot";

export const metadata = { title: "Writers' Room" };

// Drafting tomorrow's options with AI can take a few seconds the first time.
export const maxDuration = 60;

const HOW_TO_EARN = [
  ["Show up each day", "+10 to +45"],
  ["Make a riff", "+20"],
  ["Get an upvote", "+5"],
  ["Win a battle", "+3"],
  ["Vote or judge a battle", "+2"],
];

export default async function WritersRoomPage() {
  const { supabase, user, profile, progress } = await getUserAndProfile();
  if (user && !isProfileComplete(profile)) redirect("/onboarding");

  const closesAt = nyNextDayStart();
  const forDay = nyToday(new Date(closesAt));
  const info = levelInfo(progress?.xp ?? 0);
  const unlocked = Boolean(user) && info.level >= WRITERS_ROOM_LEVEL;

  const [candidates, myVote] = await Promise.all([
    ensureCandidates(forDay),
    user
      ? supabase
          .from("theme_votes")
          .select("candidate_id")
          .eq("user_id", user.id)
          .eq("for_day", forDay)
          .maybeSingle()
          .then((r) => (r.data?.candidate_id as number | undefined) ?? null)
      : null,
  ]);

  const roomLevel = LEVELS.find((l) => l.level === WRITERS_ROOM_LEVEL)!;
  const toGo = Math.max(0, roomLevel.xp - info.xp);
  const progressToRoom = Math.min(1, info.xp / roomLevel.xp);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-brand uppercase">
            🎬 Writers&apos; Room · Level {WRITERS_ROOM_LEVEL}+
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Pick tomorrow&apos;s theme
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            The AI drafted three options from what Reddit is buzzing about. Whichever gets the
            most votes goes live for everyone on {formatDay(forDay, "long")}.
          </p>
        </div>
        <p className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium tabular-nums">
          ⏱ <Countdown until={closesAt} label="Voting closes in" />
        </p>
      </div>

      <div className={`relative ${unlocked ? "" : "min-h-[32rem]"}`}>
        <div
          className={unlocked ? "" : "pointer-events-none blur-[6px] select-none"}
          aria-hidden={!unlocked}
        >
          {candidates.length ? (
            <Ballot candidates={candidates} myVote={myVote} canVote={unlocked} />
          ) : (
            <p className="rounded-3xl border-2 border-dashed border-line p-12 text-center text-muted">
              The writers are still drafting. Check back in a minute.
            </p>
          )}
        </div>

        {!unlocked && (
          <div className="absolute inset-0 flex items-start justify-center pt-4 sm:items-center sm:pt-0">
            <div className="w-full max-w-md rounded-[2rem] border border-line bg-surface p-6 text-center shadow-2xl sm:p-8">
              <p className="text-4xl">🔒</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                {user ? `Unlocks at Level ${WRITERS_ROOM_LEVEL}` : "Members only"}
              </h2>
              {user ? (
                <>
                  <p className="mt-1 text-muted">
                    You&apos;re Level {info.level} ({info.title}).{" "}
                    <span className="font-semibold text-ink">{toGo} XP to go.</span>
                  </p>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.round(progressToRoom * 100)}%` }}
                    />
                  </div>
                  <ul className="mt-5 flex flex-col gap-1 text-left text-sm">
                    {HOW_TO_EARN.map(([what, xp]) => (
                      <li key={what} className="flex justify-between gap-2">
                        <span className="text-muted">{what}</span>
                        <span className="font-semibold whitespace-nowrap">{xp}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/feed"
                    className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong"
                  >
                    Go earn XP →
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-1 text-muted">
                    Sign in, earn XP and reach Level {WRITERS_ROOM_LEVEL} to vote on what
                    everyone riffs on tomorrow.
                  </p>
                  <Link
                    href="/login?next=/writers-room"
                    className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong"
                  >
                    Sign in to start leveling up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
