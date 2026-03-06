export type Platform = "vercel" | "azure";

export const platform: Platform =
  (process.env.PLATFORM as Platform) ?? "vercel";
