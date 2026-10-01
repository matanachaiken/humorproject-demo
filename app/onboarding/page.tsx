import { redirect } from "next/navigation";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { saveNames } from "./actions";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (isProfileComplete(profile)) redirect("/members");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-10 py-24">
      <div>
        <h1 className="text-3xl font-bold">Welcome!</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Before you continue, tell us your name.
        </p>
      </div>
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error === "missing"
            ? "Please fill in both your first and last name."
            : "Something went wrong saving your name. Try again."}
        </p>
      )}
      <form action={saveNames} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">First name</span>
          <input
            name="first_name"
            required
            defaultValue={profile?.first_name ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Last name</span>
          <input
            name="last_name"
            required
            defaultValue={profile?.last_name ?? ""}
            className={inputClass}
          />
        </label>
        <button className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
          Continue
        </button>
      </form>
    </main>
  );
}
