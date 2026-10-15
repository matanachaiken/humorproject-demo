import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { nyToday } from "@/lib/day";
import { WRITERS_ROOM_LEVEL, levelInfo } from "@/lib/progression";
import ProgressHud from "./_progress/ProgressHud";
import Logo from "./Logo";
import NavLinks from "./NavLinks";

export default async function SiteHeader() {
  const { user, profile, progress } = await getUserAndProfile();
  const name = profile?.first_name || user?.email;
  const writersLocked = !progress || levelInfo(progress.xp).level < WRITERS_ROOM_LEVEL;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={user ? "/feed" : "/"} aria-label="Daily Riff home">
            <Logo />
          </Link>
          <NavLinks signedIn={Boolean(user)} writersLocked={writersLocked} variant="header" />
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            {user ? (
              <>
                {progress && <ProgressHud progress={progress} today={nyToday()} />}
                <Link
                  href="/me"
                  className="flex shrink-0 items-center gap-2 rounded-full p-1 hover:bg-surface-2 xl:pr-3"
                >
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong">
                      {(name?.[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  <span className="hidden font-medium xl:inline">{name}</span>
                </Link>
                <form action="/auth/signout" method="post" className="hidden sm:block">
                  <button className="rounded-full border border-line px-3 py-1.5 font-medium whitespace-nowrap hover:bg-surface-2">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <NavLinks signedIn={Boolean(user)} writersLocked={writersLocked} variant="tabbar" />
    </>
  );
}
