import { type NextRequest, NextResponse } from "next/server";

const getSessionCookie = async (req: NextRequest) => {
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-better-auth.session_token"
      : "better-auth.session_token";
  return req.cookies.get(cookieName);
};

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

  // Always allow these routes (no auth check needed)
  const alwaysPublicRoutes = ["/api/auth", "/_next", "/favicon.ico"];
  const isAlwaysPublic = alwaysPublicRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (isAlwaysPublic) {
    return NextResponse.next();
  }

  // Check if this is an auth page (sign-in, sign-up)
  const isAuthPage = ["/sign-in", "/sign-up"].includes(req.nextUrl.pathname);

  // Optimistic session check using cookie cache
  // Note: This is optimistic - full validation happens in ProtectedPage components
  const sessionCookie = await getSessionCookie(req);

  // Handle auth pages: redirect authenticated users away, allow unauthenticated users
  if (isAuthPage) {
    if (sessionCookie) {
      // Authenticated user trying to access sign-in/sign-up - redirect to home
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Unauthenticated user accessing sign-in/sign-up - allow access
    return NextResponse.next();
  }

  // For all other routes, require authentication
  if (!sessionCookie) {
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

