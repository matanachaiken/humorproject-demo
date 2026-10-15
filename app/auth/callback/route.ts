import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fillProfileName, isProfileComplete, safeNextPath, type Profile } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();

  // GoogleButton leaves the page to come back to in a short-lived cookie.
  const saved = request.cookies.get("auth_next")?.value;
  const back = safeNextPath(saved ? decodeURIComponent(saved) : null);
  // New account: name it from Google (or the email) instead of asking.
  if (!isProfileComplete(profile)) await fillProfileName(supabase, data.user);
  const response = NextResponse.redirect(`${origin}${back}`);
  response.cookies.delete("auth_next");
  return response;
}
