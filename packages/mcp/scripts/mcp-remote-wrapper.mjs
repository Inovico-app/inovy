import { spawn } from "node:child_process";

/**
 * Wrapper for running `mcp-remote` with an environment-driven URL.
 *
 * Why: MCP host configs typically execute commands without a shell, so `$VAR` isn't expanded
 * in args. This wrapper reads `process.env.MCP_REMOTE_URL` and provides a sensible dev fallback
 * while failing fast with a clear error in production-like environments.
 */
function resolveRemoteUrl() {
  const raw = process.env.MCP_REMOTE_URL;
  const isMissing = !raw || raw.trim().length === 0;
  const isUnexpandedPlaceholder =
    raw === "${MCP_REMOTE_URL}" || raw === "$MCP_REMOTE_URL";

  if (!isMissing && !isUnexpandedPlaceholder) return raw.trim();

  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  const isProdLike = nodeEnv === "production";

  // Sensible fallback for local dev: connect to the local Next.js instance.
  if (!isProdLike) return "http://localhost:3000/api/mcp";

  // Clear validation error for prod/preview environments.
  const error = [
    "Missing required environment variable: MCP_REMOTE_URL",
    "",
    "Set MCP_REMOTE_URL to the fully-qualified MCP endpoint, e.g.:",
    "  MCP_REMOTE_URL=https://<your-deployment>/api/mcp",
    "",
    "If you're running locally, you can omit it and we'll default to:",
    "  http://localhost:3000/api/mcp",
  ].join("\n");
  throw new Error(error);
}

function main() {
  const url = resolveRemoteUrl();

  const child = spawn("npx", ["-y", "mcp-remote", url], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (typeof code === "number") process.exit(code);
    if (signal) process.exit(1);
    process.exit(1);
  });

  child.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

try {
  main();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

