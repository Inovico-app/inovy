import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth, type BetterAuthUser } from "./lib/auth";

// Always allow these routes (no auth check needed)
const publicRoutes = [
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/accept-invitation",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-token",
];

const isAlwaysPublic = (req: NextRequest) =>
  publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));

export default async function proxy(req: NextRequest) {
  // Handle CORS for API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.append("Access-Control-Allow-Credentials", "true");
    const corsOrigin =
      process.env.CORS_ORIGIN ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    res.headers.append("Access-Control-Allow-Origin", corsOrigin);
    res.headers.append("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.append(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res;
  }

  const publicRoute = isAlwaysPublic(req);

  if (publicRoute) {
    // Early return for public/auth routes
    return NextResponse.next();
  }

  // Use a fresh session to avoid caching issues, this however has a minor performance impact
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect user to onboarding page if they have not completed onboarding
  const hasUserOnboarded = (session?.user as BetterAuthUser)
    ?.onboardingCompleted;
  if (!hasUserOnboarded) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // For all other routes, require authentication
  if (!session) {
    // Redirect to sign-in, preserving the original URL for redirect after login
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except auth callback, static files, and public pages and vercel workflow routes
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow/).*)",
    },
  ],
};

