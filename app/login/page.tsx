import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleButton from "./GoogleButton";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/members");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-start gap-6 px-10 py-32">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Sign in to see the members-only joke vault and edit your profile.
      </p>
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Sign-in failed ({String(error)}). Please try again.
        </p>
      )}
      <GoogleButton />
    </main>
  );
}
