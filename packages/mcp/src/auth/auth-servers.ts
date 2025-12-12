export function getAuthServerUrls(): string[] {
  const urls = new Set<string>();

  // If you accept Google ID tokens directly:
  if (process.env.GOOGLE_CLIENT_ID) {
    urls.add("https://accounts.google.com");
  }

  // If you accept Microsoft tokens directly:
  if (process.env.MICROSOFT_CLIENT_ID) {
    const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
    urls.add(`https://login.microsoftonline.com/${tenant}/v2.0`);
  }

  // Better Auth default sessions are opaque session tokens (cookie-based, not OAuth issuer-based).
  // We include the app URL as a best-effort "issuer" hint for clients that already possess a token.
  const appUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  if (appUrl) urls.add(appUrl);

  return Array.from(urls);
}

