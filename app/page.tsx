import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-10 py-32">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
          Humor Project
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Every day there&apos;s a new theme pulled from what NYC and college Reddit
          are talking about. Type a silly idea, AI turns it into an image, and
          everyone votes on the funniest one.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>Check today&apos;s theme</li>
          <li>Create up to 3 AI images a day</li>
          <li>Vote, and try to take the top spot</li>
        </ol>
        <Link
          href="/login"
          className="rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Sign in to play &rarr;
        </Link>
      </main>
    </div>
  );
}
