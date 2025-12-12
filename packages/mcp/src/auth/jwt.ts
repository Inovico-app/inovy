interface JwtParts {
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
}

interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  scope?: string;
  scp?: string;
  [key: string]: unknown;
}

interface JwtVerificationOptions {
  jwksUrl: string;
  expectedIssuer?: (issuer: string) => boolean;
  expectedAudience?: string;
  clockSkewSeconds?: number;
}

const DEFAULT_CLOCK_SKEW_SECONDS = 60;

function isJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function splitJwt(token: string): JwtParts | null {
  if (!isJwt(token)) return null;
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) return null;
  return { headerB64, payloadB64, signatureB64 };
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJson<T>(b64Url: string): T | null {
  try {
    const bytes = base64UrlToBytes(b64Url);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function decodeJwtUnsafe(token: string): {
  header: JwtHeader;
  payload: JwtPayload;
} | null {
  const parts = splitJwt(token);
  if (!parts) return null;
  const header = decodeJson<JwtHeader>(parts.headerB64);
  const payload = decodeJson<JwtPayload>(parts.payloadB64);
  if (!header || !payload) return null;
  return { header, payload };
}

type Jwks = { keys?: Array<Record<string, unknown>> };

const jwksCache = new Map<
  string,
  {
    fetchedAtMs: number;
    jwks: Jwks;
    byKid: Map<string, Record<string, unknown>>;
  }
>();

async function fetchJwks(jwksUrl: string): Promise<Jwks> {
  const cached = jwksCache.get(jwksUrl);
  const now = Date.now();
  const tenMinutesMs = 10 * 60 * 1000;
  if (cached && now - cached.fetchedAtMs < tenMinutesMs) return cached.jwks;

  const res = await fetch(jwksUrl, {
    method: "GET",
    headers: { accept: "application/json" },
    // Avoid caching surprises in serverless; we manage a small in-memory cache above.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS (${res.status})`);
  }
  const jwks = (await res.json()) as Jwks;
  const keys = jwks.keys ?? [];
  const byKid = new Map<string, Record<string, unknown>>();
  for (const k of keys) {
    const kid = typeof k.kid === "string" ? k.kid : undefined;
    if (kid) byKid.set(kid, k);
  }
  jwksCache.set(jwksUrl, { fetchedAtMs: now, jwks, byKid });
  return jwks;
}

async function importRs256PublicKey(
  jwk: Record<string, unknown>
): Promise<CryptoKey> {
  // Minimal validation
  const kty = jwk.kty;
  if (kty !== "RSA") throw new Error("Unsupported JWK kty");

  return crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

function hasExpectedAudience(
  aud: JwtPayload["aud"],
  expectedAudience: string
): boolean {
  if (!expectedAudience) return true;
  if (typeof aud === "string") return aud === expectedAudience;
  if (Array.isArray(aud)) return aud.includes(expectedAudience);
  return false;
}

function isIssuerAllowed(
  iss: JwtPayload["iss"],
  expectedIssuer: JwtVerificationOptions["expectedIssuer"]
): boolean {
  if (!expectedIssuer) return true;
  if (typeof iss !== "string" || !iss) return false;
  return expectedIssuer(iss);
}

function isWithinTimeWindow(
  payload: JwtPayload,
  clockSkewSeconds: number
): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const skew = clockSkewSeconds;

  if (typeof payload.nbf === "number" && nowSeconds + skew < payload.nbf) {
    return false;
  }
  if (typeof payload.exp === "number" && nowSeconds - skew >= payload.exp) {
    return false;
  }
  return true;
}

export async function verifyJwtRs256(
  token: string,
  options: JwtVerificationOptions
): Promise<JwtPayload | null> {
  const decoded = decodeJwtUnsafe(token);
  if (!decoded) return null;

  const { header, payload } = decoded;
  if (header.alg !== "RS256") return null;
  if (!header.kid) return null;

  const clockSkewSeconds =
    options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS;

  if (!isIssuerAllowed(payload.iss, options.expectedIssuer)) return null;
  if (
    options.expectedAudience &&
    !hasExpectedAudience(payload.aud, options.expectedAudience)
  ) {
    return null;
  }
  if (!isWithinTimeWindow(payload, clockSkewSeconds)) return null;

  const parts = splitJwt(token);
  if (!parts) return null;

  await fetchJwks(options.jwksUrl);
  const keyRecord = jwksCache.get(options.jwksUrl)?.byKid.get(header.kid);
  if (!keyRecord) return null;

  const publicKey = await importRs256PublicKey(keyRecord);

  const signingInput = new TextEncoder().encode(
    `${parts.headerB64}.${parts.payloadB64}`
  );
  const signatureBytes = base64UrlToBytes(parts.signatureB64);
  // WebCrypto types are picky about ArrayBuffer vs SharedArrayBuffer; normalize to a fresh ArrayBuffer.
  const signature = new Uint8Array(signatureBytes).buffer;
  const ok = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    publicKey,
    signature,
    signingInput
  );
  if (!ok) return null;
  return payload;
}

export function scopesFromJwtPayload(payload: JwtPayload): string[] {
  const raw =
    typeof payload.scope === "string"
      ? payload.scope
      : typeof payload.scp === "string"
      ? payload.scp
      : "";
  return raw
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function looksLikeJwt(token: string): boolean {
  return isJwt(token);
}

