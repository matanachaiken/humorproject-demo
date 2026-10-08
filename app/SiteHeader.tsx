import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";

export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();
  const name = profile?.first_name || user?.email;

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <Link href="/" className="font-semibold">
        Humor Project
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/feed" className="hover:underline">
              Feed
            </Link>
            <Link href="/members" className="hover:underline">
              Members
            </Link>
            <Link href="/profile" className="flex items-center gap-2 hover:underline">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : null}
              {name}
            </Link>
            <form action="/auth/signout" method="post">
              <button className="rounded-md border px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-black px-3 py-1 text-white dark:bg-zinc-50 dark:text-black"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
