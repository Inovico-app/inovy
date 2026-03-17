import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_PROVIDERS = new Set(["google", "microsoft"]);

/**
 * GET /api/auth/social-redirect?provider=google&callbackURL=/&errorCallbackURL=/sign-in
 *
 * Safari workaround for social sign-in. The default client SDK flow uses
 * fetch() to initiate OAuth, which sets the CSRF state cookie in a fetch
 * response. Safari's ITP does not reliably persist cookies from fetch
 * responses. By using a full GET navigation instead, the state cookie is
 * set in a navigation response that Safari handles correctly.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider");
  const callbackURL = searchParams.get("callbackURL") || "/";
  const errorCallbackURL = searchParams.get("errorCallbackURL") || "/sign-in";

  if (!provider || !ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.redirect(new URL(errorCallbackURL, request.url), 302);
  }

  try {
    const result = await auth.api.signInSocial({
      body: {
        provider: provider as "google" | "microsoft",
        callbackURL,
        errorCallbackURL,
      },
      headers: request.headers,
    });

    const redirectUrl =
      result.url ??
      (typeof result.redirect === "string" ? result.redirect : undefined);

    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl, 302);
    }
  } catch {
    // Fall through to error redirect
  }

  return NextResponse.redirect(new URL(errorCallbackURL, request.url), 302);
}
