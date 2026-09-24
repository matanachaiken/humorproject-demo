import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 0;

type Joke = {
  id: number;
  setup: string;
  punchline: string;
  created_at: string;
};

export default async function JokesPage() {
  const { data, error } = await supabase
    .from("jokes")
    .select("id, setup, punchline, created_at")
    .order("id", { ascending: true })
    .overrideTypes<Joke[], { merge: false }>();

  return (
    <main className="mx-auto w-full max-w-2xl p-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold">Jokes</h1>
        <Link
          href="/"
          className="text-sm text-zinc-600 underline underline-offset-4 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Home
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Couldn&apos;t load jokes: {error.message}
        </p>
      ) : !data || data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-zinc-600 dark:text-zinc-400">
          No jokes yet. Add a row to the <code>jokes</code> table to see it here.
        </p>
      ) : (
        <ul className="space-y-4">
          {data.map((joke) => (
            <li key={joke.id} className="rounded-lg border p-4">
              <p className="font-medium">{joke.setup}</p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {joke.punchline}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
