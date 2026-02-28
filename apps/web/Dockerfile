# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for Next.js app (pnpm monorepo)
# Build context must be repo root for workspace dependencies

# Stage 1: Builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

COPY . .

RUN mkdir -p apps/web/public

RUN pnpm install --frozen-lockfile

# Build-time env vars (placeholders; real values injected at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_PUBLIC_APP_URL="https://placeholder.inovico.nl"
ENV BETTER_AUTH_SECRET="build-placeholder-32-chars-minimum-required"
ENV DEEPGRAM_API_KEY="build-placeholder-not-used-at-runtime"

# Increase Node memory for CI (GitHub Actions has 7GB)
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN pnpm build --filter=web

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone output: server.js in apps/web for monorepo
CMD ["node", "apps/web/server.js"]
