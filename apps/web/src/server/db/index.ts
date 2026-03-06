const platform = process.env.PLATFORM ?? "vercel";

const { db } = platform === "azure"
  ? await import("./db.azure")
  : await import("./db.vercel");

export { db };

