import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export function isProfileComplete(profile: Profile | null) {
  return Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
}

export async function getUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { supabase, user, profile };
}

// Use in protected pages: sends signed-out users to /login and
// users without a first/last name to /onboarding.
export async function requireCompleteProfile() {
  const result = await getUserAndProfile();
  if (!result.user) redirect("/login");
  if (!isProfileComplete(result.profile)) redirect("/onboarding");
  return { ...result, user: result.user, profile: result.profile! };
}
