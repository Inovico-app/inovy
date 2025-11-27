import { getCookieCache } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  // Handle CORS for API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.append("Access-Control-Allow-Credentials", "true");
    res.headers.append(
      "Access-Control-Allow-Origin",
      process.env.CORS_ORIGIN || ""
    );
    res.headers.append("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.append(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res;
  }

  // Skip auth check for public routes
  const publicRoutes = [
    "/sign-in",
    "/sign-up",
    "/api/auth",
    "/_next",
    "/favicon.ico",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Optimistic session check using cookie cache
  // Note: This is optimistic - full validation happens in ProtectedPage components
  const session = await getCookieCache(req);

  if (!session) {
    // Redirect to sign-in, preserving the original URL for redirect after login
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth pages
  if (["/sign-in", "/sign-up"].includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
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

