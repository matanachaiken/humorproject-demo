import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { nyToday } from "@/lib/day";

// The feed, battles, riff pages and Hall of Fame are public (read-only when
// signed out). Pages about *you* need an account.
const PROTECTED_PREFIXES = ["/me", "/profile", "/onboarding"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token if it has expired, then verifies it locally
  // (asymmetric signing keys), so navigations don't wait on Supabase Auth.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ?? null;

  // First visit of the day extends the streak and grants visit XP. A cookie
  // remembers today's check-in so this costs one database call per day.
  const checkInKey = `${user}:${nyToday()}`;
  if (user && request.cookies.get("dr_checkin")?.value !== checkInKey) {
    const { error } = await supabase.rpc("check_in");
    if (!error) {
      response.cookies.set("dr_checkin", checkInKey, {
        path: "/",
        maxAge: 60 * 60 * 36,
        sameSite: "lax",
        httpOnly: true,
      });
    }
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
