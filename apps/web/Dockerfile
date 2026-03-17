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

# Build args for NEXT_PUBLIC_* (required at build time; passed from CI)
ARG NEXT_PUBLIC_PLATFORM=azure
ARG NEXT_PUBLIC_APP_URL=https://placeholder.inovico.nl
ARG NEXT_PUBLIC_BLOB_STORAGE_PROVIDER=azure
ARG NEXT_PUBLIC_WEBHOOK_URL=
ARG NEXT_PUBLIC_KVK_NUMBER=
ARG NEXT_PUBLIC_DEEPGRAM_API_KEY=

# Build-time env vars (NEXT_PUBLIC_* inlined into client bundle at build)
ENV DOCKER_BUILD=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV BETTER_AUTH_SECRET="build-placeholder-32-chars-minimum-required"
ENV DEEPGRAM_API_KEY="build-placeholder-not-used-at-runtime"

ENV NEXT_PUBLIC_PLATFORM=${NEXT_PUBLIC_PLATFORM}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_BLOB_STORAGE_PROVIDER=${NEXT_PUBLIC_BLOB_STORAGE_PROVIDER}
ENV NEXT_PUBLIC_WEBHOOK_URL=${NEXT_PUBLIC_WEBHOOK_URL}
ENV NEXT_PUBLIC_KVK_NUMBER=${NEXT_PUBLIC_KVK_NUMBER}
ENV NEXT_PUBLIC_DEEPGRAM_API_KEY=${NEXT_PUBLIC_DEEPGRAM_API_KEY}

# Increase Node memory for CI (GitHub Actions has 7GB)
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN pnpm build --filter=web

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_BUILD=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Migration support (pnpm db:migrate in ACA Jobs)
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json /app/apps/web/drizzle.config.ts ./apps/web/
COPY --from=builder /app/apps/web/src/server/db ./apps/web/src/server/db
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone output: server.js in apps/web for monorepo
CMD ["node", "apps/web/server.js"]
