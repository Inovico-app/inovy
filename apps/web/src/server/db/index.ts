import { platform } from "@/lib/platform";

const { db } = platform === "azure"
  ? await import("./db.azure")
  : await import("./db.vercel");

export { db };

