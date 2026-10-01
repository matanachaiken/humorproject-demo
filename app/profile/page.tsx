import { requireCompleteProfile } from "@/lib/auth";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { user, profile } = await requireCompleteProfile();

  return (
    <main className="mx-auto w-full max-w-md px-10 py-16">
      <h1 className="text-3xl font-bold">Your profile</h1>
      <p className="mt-1 mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {user.email}
      </p>
      <ProfileForm profile={profile} />
    </main>
  );
}
