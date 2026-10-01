import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";

export default async function MembersPage() {
  const { supabase, profile } = await requireCompleteProfile();

  const { count } = await supabase
    .from("jokes")
    .select("id", { count: "exact", head: true });

  return (
    <main className="mx-auto w-full max-w-2xl px-10 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Members only
      </p>
      <h1 className="mt-2 text-4xl font-bold">
        Welcome back, {profile.first_name}!
      </h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        You&apos;re signed in, so you can see this page. Signed-out visitors
        get sent to the login screen.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/jokes"
          className="rounded-lg border p-5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <p className="text-2xl font-bold">{count ?? 0}</p>
          <p className="text-zinc-600 dark:text-zinc-400">jokes in the collection &rarr;</p>
        </Link>
        <Link
          href="/profile"
          className="rounded-lg border p-5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <p className="text-2xl font-bold">Profile</p>
          <p className="text-zinc-600 dark:text-zinc-400">Edit your name and photo &rarr;</p>
        </Link>
      </div>
    </main>
  );
}
