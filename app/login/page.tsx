import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, safeNextPath } from "@/lib/auth";
import { LogoMark } from "@/app/Logo";
import GoogleButton from "./GoogleButton";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);
  if (user) redirect(nextPath);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-[2rem] border border-line bg-surface p-8 text-center shadow-xl">
        <LogoMark className="mx-auto h-14 w-14" />
        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight">Welcome to Daily Riff</h1>
        <p className="mt-2 text-muted">
          Sign in to make AI riffs on today&apos;s theme, vote, and battle for the top spot.
        </p>
        {error && (
          <p className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Sign-in failed ({String(error)}). Please try again.
          </p>
        )}
        <div className="mt-6">
          <GoogleButton next={nextPath} />
        </div>
        <p className="mt-4 text-xs text-muted">We only use your name and photo for your riffs.</p>
      </div>
    </main>
  );
}
