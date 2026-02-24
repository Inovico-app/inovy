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

/**
 * Apply comprehensive security headers to response
 * Following OWASP recommendations and NEN 7510 guidelines
 */
function applySecurityHeaders(res: NextResponse): void {
  // Content Security Policy - Prevent XSS and injection attacks
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://vercel.live https://*.vercel.app https://*.google.com https://*.googleapis.com wss://*.pusher.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security - Enforce HTTPS (2 years)
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // X-Frame-Options - Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options - Prevent MIME sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer Policy - Control referrer information
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy - Control browser features
  const permissions = [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
  ].join(", ");
  res.headers.set("Permissions-Policy", permissions);

  // X-DNS-Prefetch-Control - Control DNS prefetching
  res.headers.set("X-DNS-Prefetch-Control", "off");

  // X-Download-Options - Prevent file execution in IE
  res.headers.set("X-Download-Options", "noopen");

  // X-Permitted-Cross-Domain-Policies - Control Adobe products cross-domain
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
}

/**
 * Apply CORS headers for API routes
 * Configured according to security guidelines with restricted origins
 */
function applyCorsHeaders(res: NextResponse, req: NextRequest): void {
  // Allow credentials for authenticated requests
  res.headers.set("Access-Control-Allow-Credentials", "true");

  // Restrict CORS to configured origins only
  const corsOrigin =
    process.env.CORS_ORIGIN ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  // Validate origin against allowed origins
  const requestOrigin = req.headers.get("origin");
  const allowedOrigins = corsOrigin.split(",").map((o) => o.trim());

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.headers.set("Access-Control-Allow-Origin", requestOrigin);
  } else {
    // Default to first configured origin if request origin not in whitelist
    res.headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
  }

  // Restrict to necessary HTTP methods only
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  // Allow necessary headers
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  // Control preflight cache duration (24 hours)
  res.headers.set("Access-Control-Max-Age", "86400");
}

export default async function proxy(req: NextRequest) {
  // Handle preflight requests for CORS
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCorsHeaders(res, req);
    applySecurityHeaders(res);
    return res;
  }

  // Handle CORS for API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    applyCorsHeaders(res, req);
    applySecurityHeaders(res);
    return res;
  }

  const publicRoute = isAlwaysPublic(req);

  if (publicRoute) {
    // Apply security headers to public routes
    const res = NextResponse.next();
    applySecurityHeaders(res);
    return res;
  }

  // Use a fresh session to avoid caching issues, this however has a minor performance impact
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect user to onboarding page if they have not completed onboarding
  const hasUserOnboarded = (session?.user as BetterAuthUser)
    ?.onboardingCompleted;
  if (!hasUserOnboarded) {
    const res = NextResponse.redirect(new URL("/onboarding", req.url));
    applySecurityHeaders(res);
    return res;
  }

  // For all other routes, require authentication
  if (!session) {
    // Redirect to sign-in, preserving the original URL for redirect after login
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", req.nextUrl.pathname);
    const res = NextResponse.redirect(signInUrl);
    applySecurityHeaders(res);
    return res;
  }

  // Apply security headers to authenticated routes
  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
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

