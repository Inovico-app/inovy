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

function setSecurityHeaders(res: NextResponse) {
  // HSTS: Enforce HTTPS for 1 year, include subdomains
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Prevent MIME sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");

  // Content Security Policy
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // Referrer Policy
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
    ].join(", ")
  );

  // X-DNS-Prefetch-Control
  res.headers.set("X-DNS-Prefetch-Control", "on");

  return res;
}

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
    return setSecurityHeaders(res);
  }

  const publicRoute = isAlwaysPublic(req);

  if (publicRoute) {
    // Early return for public/auth routes
    return setSecurityHeaders(NextResponse.next());
  }

  // Use a fresh session to avoid caching issues, this however has a minor performance impact
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect user to onboarding page if they have not completed onboarding
  const hasUserOnboarded = (session?.user as BetterAuthUser)
    ?.onboardingCompleted;
  if (!hasUserOnboarded) {
    return setSecurityHeaders(
      NextResponse.redirect(new URL("/onboarding", req.url))
    );
  }

  // For all other routes, require authentication
  if (!session) {
    // Redirect to sign-in, preserving the original URL for redirect after login
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return setSecurityHeaders(NextResponse.redirect(signInUrl));
  }

  return setSecurityHeaders(NextResponse.next());
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

