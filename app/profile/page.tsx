import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "Edit profile" };

export default async function ProfilePage() {
  const { user, profile } = await requireCompleteProfile();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Link href="/me" className="mb-6 inline-block text-sm font-medium text-muted hover:text-ink">
        ← My riffs
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Edit profile</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Signed in as {user.email}
      </p>
      <ProfileForm profile={profile} />
    </main>
  );
}
