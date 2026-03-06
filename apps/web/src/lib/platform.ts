export type Platform = "vercel" | "azure";

const VALID_PLATFORMS: readonly Platform[] = ["vercel", "azure"] as const;

const raw = process.env.PLATFORM ?? "vercel";

if (!VALID_PLATFORMS.includes(raw as Platform)) {
  throw new Error(
    `Invalid PLATFORM env var: "${raw}". Must be one of: ${VALID_PLATFORMS.join(", ")}`
  );
}

export const platform: Platform = raw as Platform;
