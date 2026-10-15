import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import Logo from "./Logo";
import NavLinks from "./NavLinks";

export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();
  const name = profile?.first_name || user?.email;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={user ? "/feed" : "/"} aria-label="Daily Riff home">
            <Logo />
          </Link>
          <NavLinks signedIn={Boolean(user)} variant="header" />
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <Link
                  href="/me"
                  className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 hover:bg-surface-2 sm:pr-3"
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
                  <span className="hidden font-medium sm:inline">{name}</span>
                </Link>
                <form action="/auth/signout" method="post">
                  <button className="rounded-full border border-line px-3 py-1.5 font-medium hover:bg-surface-2">
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
      <NavLinks signedIn={Boolean(user)} variant="tabbar" />
    </>
  );
}
