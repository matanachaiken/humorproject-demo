import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fillProfileName, safeNextPath } from "@/lib/auth";

// There's no name form anymore. A profile that somehow has no name (e.g. an
// account from before names were automatic) lands here, gets one, and moves on.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  await fillProfileName(supabase, user);
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(next, request.url));
}
