import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { type NextRequest, NextResponse } from "next/server";

export default function proxy(req: NextRequest) {
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

  // Apply Kinde auth for all other routes
  return withAuth(req, {
    isReturnToCurrentPage: true,
  });
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

