# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Inovy is an AI-Powered Meeting Recording & Management Platform. It is a Turborepo monorepo with:

- **`apps/web`** — Main Next.js 16 application (port 3000)
- **`packages/mcp`** — MCP (Model Context Protocol) server package

### Running services

- **Dev server**: `pnpm dev:web` (or `cd apps/web && npx next dev --turbopack`) — starts on port 3000
- All required cloud service credentials (DATABASE_URL, OPENAI_API_KEY, QDRANT_URL, etc.) are injected as environment variables. A minimal `apps/web/.env.local` sets `BETTER_AUTH_URL=http://localhost:3000` and `RESEND_FROM_EMAIL`.

### Lint / Typecheck / Build

Standard commands documented in the root `package.json`:

| Command | Scope | Notes |
|---------|-------|-------|
| `pnpm lint` | web (via turbo) | Uses `--max-warnings 0`; the existing codebase has pre-existing warnings/errors |
| `pnpm typecheck` | all packages | Clean pass expected |
| `pnpm build` | all packages | Runs full production build |

Direct usage from `apps/web`: `pnpm lint`, `pnpm run typecheck`, `pnpm run build`.

### Non-obvious caveats

- **pnpm build scripts**: The root `package.json` includes `pnpm.onlyBuiltDependencies` to allow native packages (`@swc/core`, `@tailwindcss/oxide`, `esbuild`, `sharp`, `@vercel/speed-insights`) to run their postinstall scripts. Without this, Tailwind CSS and image optimization will not work.
- **Lint `--max-warnings 0`**: The web app's lint script (`eslint --fix --max-warnings 0`) exits non-zero on warnings. The existing codebase has ~99 warnings and ~15 errors. When adding code, aim to not increase the warning count.
- **Auth flow**: Sign-up creates an account and redirects to sign-in. Email verification may be required before login works. For full authenticated testing, use an email that can receive verification emails via Resend, or bypass verification in the database directly.
- **Database**: Uses Neon serverless PostgreSQL. Migrations are in `apps/web/src/server/db/migrations/`. Run `pnpm db:migrate` to apply. Do NOT run `pnpm db:push` in production per the workspace rules.
- **Qdrant**: Can be run locally via `docker compose up -d qdrant` (optional). Production uses cloud-hosted Qdrant configured via `QDRANT_URL` and `QDRANT_API_KEY` env vars.
- **Workflow plugin**: `next.config.ts` wraps config with `withWorkflow()` from the `workflow` package, which adds startup time (~3s) for discovering workflow directives.
