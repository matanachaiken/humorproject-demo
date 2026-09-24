import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-10 py-32">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
          Humor Project
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          A small collection of setups and punchlines.
        </p>
        <Link
          href="/jokes"
          className="rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Browse the jokes &rarr;
        </Link>
      </main>
    </div>
  );
}
