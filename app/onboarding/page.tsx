import { redirect } from "next/navigation";
import { getUserAndProfile, isProfileComplete } from "@/lib/auth";
import { saveNames } from "./actions";

const inputClass =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3 focus:ring-4 focus:ring-brand/30 focus:outline-none";

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (isProfileComplete(profile)) redirect("/feed");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:py-24">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Welcome to Daily Riff!</h1>
        <p className="mt-2 text-muted">
          What should we call you? Your riffs show your first name and last initial.
        </p>
      </div>
      {error && (
        <p className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
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
        <button className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong">
          Continue
        </button>
      </form>
    </main>
  );
}
