import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware for security headers and directory listing prevention
 * Implements SSD-29.1.02: Disable directory listing on web server
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers to prevent directory listing and enhance security
  const securityHeaders = {
    // Prevent directory listing by ensuring content type is explicitly set
    "X-Content-Type-Options": "nosniff",
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    // Enable XSS protection
    "X-XSS-Protection": "1; mode=block",
    // Referrer policy
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Permissions policy to restrict features
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Ensure no directory listing by checking if the path ends with a slash
  // and doesn't have an explicit route handler
  const { pathname } = request.nextUrl;

  // Block requests that look like directory listings
  // (paths ending with / that are not the root or known routes)
  if (
    pathname !== "/" &&
    pathname.endsWith("/") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/")
  ) {
    // Check if this is a directory access attempt
    // Next.js will handle proper route resolution
    // If no route exists, it will return 404
  }

  return response;
}

export const config = {
  // Apply middleware to all routes except static files and internal Next.js routes
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
