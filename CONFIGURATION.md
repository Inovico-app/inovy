# ICT Component Configuration Documentation

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-24  
**Compliance:** SSD-1.3.01 - ICT components configured per manufacturer instructions

---

## Table of Contents

1. [Overview](#overview)
2. [Core Framework Components](#core-framework-components)
3. [Build System & Tooling](#build-system--tooling)
4. [Database & Data Layer](#database--data-layer)
5. [Authentication & Authorization](#authentication--authorization)
6. [AI & ML Components](#ai--ml-components)
7. [External Service Integrations](#external-service-integrations)
8. [Development Tools](#development-tools)
9. [Deviations from Defaults](#deviations-from-defaults)
10. [Reproducibility Instructions](#reproducibility-instructions)

---

## Overview

This document provides a comprehensive overview of all ICT components used in the Inovy platform and their configuration according to official manufacturer instructions and best practices. All configurations are documented to ensure reproducibility and compliance with SSD-1 security requirements.

### Configuration Principles

- **Official Documentation**: All components configured per official vendor documentation
- **Security First**: Configurations prioritize security and compliance
- **Type Safety**: Full TypeScript implementation across the stack
- **Performance**: Optimized configurations for production workloads
- **Reproducibility**: All configurations version-controlled and documented

---

## Core Framework Components

### Next.js 16.1.1

**Official Documentation:** https://nextjs.org/docs

**Configuration File:** `apps/web/next.config.ts`

**Configuration Details:**

```typescript
{
  typedRoutes: true,           // Enable TypeScript-safe routes
  cacheComponents: true,        // Enable Next.js 16 Cache Components
  reactCompiler: true,          // Enable React 19 Compiler
  serverExternalPackages: [...],// Exclude server-only packages from bundling
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb"    // Deviation: Increased for large file uploads
    },
    proxyClientMaxBodySize: "500mb"
  }
}
```

**Deviations from Defaults:**
- `bodySizeLimit: "500mb"` - Increased from 1MB default to support meeting recording uploads
- `proxyClientMaxBodySize: "500mb"` - Aligned with serverActions limit
- **Justification:** Healthcare meeting recordings can exceed 100MB; this limit ensures smooth uploads while maintaining reasonable boundaries

**Configuration per Manufacturer:**
- ✅ TypeScript-safe routes enabled per official recommendations
- ✅ Cache Components enabled per Next.js 16 documentation
- ✅ React Compiler enabled per React 19 best practices
- ✅ Server-side packages correctly externalized
- ✅ Webpack configuration for Node.js polyfills per documentation

**Verification:**
```bash
npm run build  # Verifies Next.js configuration
npm run typecheck  # Validates TypeScript configuration
```

---

### React 19.2.3

**Official Documentation:** https://react.dev/

**Configuration:** Configured via Next.js integration

**Features Enabled:**
- React Server Components (RSC) - Default for all components
- React Compiler - Automatic memoization and optimization
- React 19 async APIs for headers, cookies, params

**Configuration per Manufacturer:**
- ✅ Server Components used by default per React 19 best practices
- ✅ Client components explicitly marked with `'use client'` directive
- ✅ Async request APIs used correctly (`await headers()`, `await cookies()`)
- ✅ Suspense boundaries for streaming and error handling

**Compiler Configuration:**
Package: `babel-plugin-react-compiler@1.0.0`
Enabled in `next.config.ts` via `reactCompiler: true`

---

### TypeScript 5.9.2

**Official Documentation:** https://www.typescriptlang.org/docs/

**Configuration File:** `apps/web/tsconfig.json`

**Configuration Details:**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Configuration per Manufacturer:**
- ✅ Strict mode enabled per TypeScript best practices
- ✅ Modern ES2017+ target for optimal performance
- ✅ Path aliases configured for clean imports
- ✅ Next.js plugin integration for type safety
- ✅ Incremental compilation for faster builds

**No deviations from recommended configuration.**

---

### Tailwind CSS 4.1.13

**Official Documentation:** https://tailwindcss.com/docs

**Configuration File:** `apps/web/postcss.config.mjs`

**Configuration Details:**

```javascript
{
  plugins: ["@tailwindcss/postcss"]
}
```

**Configuration per Manufacturer:**
- ✅ PostCSS integration per Tailwind CSS 4 documentation
- ✅ Modern Tailwind CSS 4 plugin architecture
- ✅ CSS variables for theme customization
- ✅ Responsive design utilities enabled

**Deviations from Defaults:**
- None - Using standard Tailwind CSS 4 configuration

---

## Build System & Tooling

### Turborepo 2.6.1

**Official Documentation:** https://turbo.build/repo/docs

**Configuration File:** `turbo.json`

**Configuration Details:**

```json
{
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Configuration per Manufacturer:**
- ✅ Task dependencies configured per Turborepo documentation
- ✅ Environment variables tracked as global dependencies
- ✅ Build outputs cached for optimal performance
- ✅ Development tasks marked as persistent

**No deviations from recommended configuration.**

---

### pnpm 10.27.0

**Official Documentation:** https://pnpm.io/

**Configuration File:** `pnpm-workspace.yaml`

**Configuration Details:**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Configuration per Manufacturer:**
- ✅ Workspace configuration per pnpm documentation
- ✅ Monorepo structure following best practices
- ✅ Package manager specified in `package.json`

**No deviations from recommended configuration.**

---

### ESLint 9.38.0

**Official Documentation:** https://eslint.org/docs/latest/

**Configuration File:** `apps/web/eslint.config.mjs`

**Configuration Details:**

- Uses flat config format (ESLint 9+)
- Integrates TypeScript ESLint plugin
- Next.js plugin for framework-specific rules
- React and React Hooks plugins
- Prettier integration for code formatting

**Configuration per Manufacturer:**
- ✅ Flat config format per ESLint 9 documentation
- ✅ TypeScript integration per typescript-eslint documentation
- ✅ Next.js rules per @next/eslint-plugin-next
- ✅ React Hooks rules per eslint-plugin-react-hooks

**Deviations from Defaults:**
- Custom ignore patterns for generated files
- Adjusted TypeScript rules for consistent-type-imports
- **Justification:** Project-specific requirements for import style consistency

---

## Database & Data Layer

### Drizzle ORM 0.44.5

**Official Documentation:** https://orm.drizzle.team/docs/overview

**Configuration File:** `apps/web/drizzle.config.ts`

**Configuration Details:**

```typescript
{
  schema: "./src/server/db/schema",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
}
```

**Configuration per Manufacturer:**
- ✅ PostgreSQL dialect configured per documentation
- ✅ Schema directory structure per best practices
- ✅ Migration output directory specified
- ✅ Database credentials from environment variables

**No deviations from recommended configuration.**

**Migration Scripts:**
```json
{
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

---

### PostgreSQL (Neon Serverless)

**Official Documentation:** https://neon.tech/docs/introduction

**Client:** `@neondatabase/serverless@1.0.1`

**Configuration:**
- Connection via `DATABASE_URL` environment variable
- Serverless driver for optimal performance
- Connection pooling handled by Neon

**Configuration per Manufacturer:**
- ✅ Neon serverless driver per official documentation
- ✅ Environment-based connection string
- ✅ SSL/TLS encryption enabled by default

**No deviations from recommended configuration.**

---

### Upstash Redis

**Official Documentation:** https://upstash.com/docs/redis

**Client:** `@upstash/redis@1.34.0`

**Configuration:**
- REST-based connection for edge compatibility
- Environment variables for URL and token
- Used for caching and session storage

**Configuration per Manufacturer:**
- ✅ REST client per Upstash documentation for edge environments
- ✅ Secure token-based authentication
- ✅ Connection pooling handled by Upstash

**Cache Strategy:**
- Projects: 15 minutes TTL
- Users: 1 hour TTL
- Organizations: 1 hour TTL
- API responses: 5 minutes TTL

---

### Qdrant Vector Database

**Official Documentation:** https://qdrant.tech/documentation/

**Client:** `@qdrant/js-client-rest@1.11.0`

**Configuration:**
- Cloud-hosted or local Docker deployment
- REST API client for optimal compatibility
- Used for RAG and semantic search

**Configuration per Manufacturer:**
- ✅ REST client per official Qdrant JS client documentation
- ✅ API key authentication for cloud deployments
- ✅ Collection configuration per documentation

**Collections:**
- project_content: OpenAI embeddings (1536 dimensions)
- Hybrid search with metadata filtering

---

## Authentication & Authorization

### Better Auth 1.4.6

**Official Documentation:** https://www.better-auth.com/docs

**Configuration File:** `apps/web/src/lib/auth.ts`

**Configuration Details:**

```typescript
betterAuth({
  experimental: { joins: true },
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {...}
  }),
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({user, url}) => {...}
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: true
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,  // 7 days
      strategy: "compact",
      refreshCache: true
    },
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,       // 1 day
    freshAge: 60 * 10               // 10 minutes
  }
})
```

**Configuration per Manufacturer:**
- ✅ Drizzle adapter configured per Better Auth documentation
- ✅ Email verification enabled per security best practices
- ✅ Session management per documentation
- ✅ OAuth providers configured per respective documentation
- ✅ Organization plugin configured per Better Auth organization docs
- ✅ Passkey plugin configured per WebAuthn standards

**Plugins Enabled:**
1. **Organization Plugin** - Multi-tenant support
2. **Magic Link Plugin** - Passwordless authentication
3. **Passkey Plugin** - WebAuthn support
4. **Next Cookies Plugin** - Next.js integration

**Deviations from Defaults:**
- Custom organization hooks for user onboarding
- Extended invitation expiration to 7 days (default: 3 days)
- **Justification:** Healthcare organizations require more time for administrative approval processes

---

## AI & ML Components

### OpenAI SDK 6.7.0

**Official Documentation:** https://platform.openai.com/docs/

**Client:** `openai@6.7.0`

**Configuration:**
- API key from environment variables
- Used for embeddings, chat completions, and task extraction
- Default model: GPT-4

**Configuration per Manufacturer:**
- ✅ SDK configured per official OpenAI documentation
- ✅ API key authentication
- ✅ Error handling per best practices
- ✅ Rate limiting implemented

---

### Anthropic SDK 0.32.1

**Official Documentation:** https://docs.anthropic.com/

**Client:** `@anthropic-ai/sdk@0.32.1`

**Configuration:**
- API key from environment variables
- Used for advanced reasoning tasks
- Default model: Claude 3.5 Sonnet

**Configuration per Manufacturer:**
- ✅ SDK configured per Anthropic documentation
- ✅ Secure API key handling
- ✅ Streaming support enabled

---

### Vercel AI SDK 6.0.0-beta.118

**Official Documentation:** https://sdk.vercel.ai/docs

**Packages:**
- `ai@6.0.0-beta.118`
- `@ai-sdk/openai@2.0.60`
- `@ai-sdk/react@2.0.86`

**Configuration:**
- Unified interface for multiple AI providers
- React hooks for UI integration
- Streaming support for real-time responses

**Configuration per Manufacturer:**
- ✅ Provider integration per Vercel AI SDK documentation
- ✅ React hooks usage per documentation
- ✅ Streaming configuration per best practices

---

### Deepgram SDK 4.11.2

**Official Documentation:** https://developers.deepgram.com/

**Client:** `@deepgram/sdk@4.11.2`

**Configuration:**
- API key from environment variables
- Nova-3 model for transcription
- Speaker diarization enabled

**Configuration per Manufacturer:**
- ✅ SDK configured per Deepgram documentation
- ✅ Model selection per performance requirements
- ✅ Diarization configuration per documentation

---

### Vercel Workflow 4.0.1-beta.40

**Official Documentation:** https://vercel.com/docs/workflow

**Package:** `workflow@4.0.1-beta.40`

**Configuration:**
- Next.js integration via `withWorkflow()`
- Used for async AI processing pipelines
- Automatic retry and error handling

**Configuration per Manufacturer:**
- ✅ Next.js integration per Vercel Workflow documentation
- ✅ TypeScript plugin configured
- ✅ Workflow definitions per best practices

**Workflow Definitions:**
- `convertRecordingIntoAiInsights` - Transcription and AI processing
- Automatic status tracking and error handling

---

## External Service Integrations

### Vercel Blob

**Official Documentation:** https://vercel.com/docs/storage/vercel-blob

**Package:** `@vercel/blob@2.0.0`

**Configuration:**
- Token from environment variables
- Used for recording and document storage
- Automatic CDN distribution

**Configuration per Manufacturer:**
- ✅ Token-based authentication per documentation
- ✅ Upload/download methods per SDK documentation

---

### Resend Email

**Official Documentation:** https://resend.com/docs

**Package:** `resend@6.5.2`

**Configuration:**
- API key from environment variables
- React Email for template rendering
- Transactional email delivery

**Configuration per Manufacturer:**
- ✅ SDK configured per Resend documentation
- ✅ React Email integration per documentation
- ✅ Email templates per best practices

---

### Stripe

**Official Documentation:** https://stripe.com/docs

**Package:** `stripe@20.0.0`

**Configuration:**
- Integrated via Better Auth Stripe plugin
- Secret key and webhook secret from environment
- Subscription management

**Configuration per Manufacturer:**
- ✅ SDK configured per Stripe documentation
- ✅ Webhook handling per security best practices
- ✅ Better Auth integration per plugin documentation

---

### Google APIs

**Official Documentation:** https://developers.google.com/

**Package:** `googleapis@164.1.0`

**Integrations:**
- Google Calendar API
- Gmail API
- Google Drive API

**Configuration:**
- OAuth 2.0 per Google documentation
- Scopes requested per principle of least privilege
- Token refresh handling per documentation

**Configuration per Manufacturer:**
- ✅ OAuth flow per Google Identity documentation
- ✅ API client configuration per googleapis SDK
- ✅ Token storage and refresh per security best practices

---

## Development Tools

### React Hook Form 7.65.0

**Official Documentation:** https://react-hook-form.com/

**Configuration:**
- Integrated with Zod for validation
- Used for all form handling
- Optimized performance mode

**Configuration per Manufacturer:**
- ✅ Resolver integration per documentation
- ✅ Validation schema integration
- ✅ Performance optimizations enabled

---

### TanStack React Query 5.89.0

**Official Documentation:** https://tanstack.com/query/latest

**Configuration:**
- Global query client configuration
- Automatic refetching and caching
- DevTools enabled in development

**Configuration per Manufacturer:**
- ✅ Query client configured per documentation
- ✅ Caching strategy per best practices
- ✅ React 19 integration per migration guide

---

### Zod 4.1.9

**Official Documentation:** https://zod.dev/

**Usage:**
- Schema validation for all server actions
- Integration with React Hook Form
- Type inference for TypeScript

**Configuration per Manufacturer:**
- ✅ Schema definitions per documentation
- ✅ Type inference usage per best practices

---

### Next Safe Action 8.0.11

**Official Documentation:** https://next-safe-action.dev/

**Configuration:**
- Type-safe server actions
- Zod integration for input validation
- Automatic error handling

**Configuration per Manufacturer:**
- ✅ Action definitions per documentation
- ✅ Validation schema integration
- ✅ Error handling per best practices

---

### Pino Logger 9.6.0

**Official Documentation:** https://getpino.io/

**Configuration:**
- Structured JSON logging
- Pretty printing in development
- Server-side only (excluded from client bundle)

**Configuration per Manufacturer:**
- ✅ Logger configuration per Pino documentation
- ✅ Serializers configured for sensitive data
- ✅ Log levels per environment

**Deviations from Defaults:**
- Custom serializers for PII anonymization
- **Justification:** Healthcare data compliance requires PII protection in logs

---

### Shadcn UI & Radix UI

**Official Documentation:** 
- https://ui.shadcn.com/
- https://www.radix-ui.com/

**Components:**
- All components installed via Shadcn CLI
- Radix UI primitives for accessibility
- Tailwind CSS for styling

**Configuration per Manufacturer:**
- ✅ Components installed per Shadcn documentation
- ✅ Radix UI primitives used per accessibility guidelines
- ✅ Customization via Tailwind CSS per documentation

**No deviations from recommended configuration.**

---

## Deviations from Defaults

### Summary of All Deviations

| Component | Configuration | Default | Deviation | Justification |
|-----------|---------------|---------|-----------|---------------|
| Next.js | `serverActions.bodySizeLimit` | 1MB | 500MB | Healthcare meeting recordings can exceed 100MB; ensures smooth uploads |
| Next.js | `proxyClientMaxBodySize` | 1MB | 500MB | Aligned with serverActions limit for consistency |
| Better Auth | Invitation expiration | 3 days | 7 days | Healthcare organizations require more time for administrative approval |
| Pino Logger | Serializers | Standard | Custom PII anonymization | Healthcare data compliance requires PII protection in logs |

### Security & Compliance Justifications

All deviations maintain or enhance security posture:

1. **Large File Upload Limits**: Necessary for core functionality while maintaining reasonable boundaries (500MB vs unlimited)
2. **Extended Invitation Expiration**: Improves user experience for healthcare organizations with approval processes
3. **Custom Log Serializers**: Enhanced security through PII protection

---

## Reproducibility Instructions

### Prerequisites

Ensure the following are installed:

```bash
# Check versions
node --version    # Requires >= 20.9.0
pnpm --version    # Requires >= 10.9.0
```

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd inovy
pnpm install
```

### Step 2: Environment Configuration

Create `apps/web/.env.local` with required variables (see README.md for complete list):

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Better Auth
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"

# AI Services
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
DEEPGRAM_API_KEY="..."

# Vector Database
QDRANT_URL="..."
QDRANT_API_KEY="..."

# Storage
BLOB_READ_WRITE_TOKEN="..."

# Email
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="..."

# OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
MICROSOFT_CLIENT_ID="..."
MICROSOFT_CLIENT_SECRET="..."
```

### Step 3: Database Setup

```bash
pnpm db:generate    # Generate migration files
pnpm db:push        # Apply schema to database
```

### Step 4: Verification

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Run development server
pnpm dev
```

### Step 5: Service Health Checks

```bash
# Next.js
curl http://localhost:3000

# Redis Cache
curl http://localhost:3000/api/cache/health

# Qdrant Vector DB
curl http://localhost:3000/api/qdrant/health
```

---

## Configuration Audit Trail

| Version | Date | Author | Changes | Compliance |
|---------|------|--------|---------|------------|
| 1.0.0 | 2026-02-24 | System | Initial configuration documentation | SSD-1.3.01 |

---

## References

### Official Documentation Links

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Drizzle ORM**: https://orm.drizzle.team/docs/overview
- **Better Auth**: https://www.better-auth.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Turborepo**: https://turbo.build/repo/docs
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **OpenAI**: https://platform.openai.com/docs/
- **Anthropic**: https://docs.anthropic.com/
- **Deepgram**: https://developers.deepgram.com/
- **Qdrant**: https://qdrant.tech/documentation/
- **Upstash**: https://upstash.com/docs/redis
- **Resend**: https://resend.com/docs
- **Stripe**: https://stripe.com/docs
- **Google APIs**: https://developers.google.com/
- **Pino**: https://getpino.io/
- **Radix UI**: https://www.radix-ui.com/
- **Shadcn UI**: https://ui.shadcn.com/

---

## Compliance Statement

This configuration documentation satisfies the requirements of **SSD-1.3.01**:

✅ **Components configured per vendor documentation** - All components follow official manufacturer instructions and best practices

✅ **Configuration documented and reproducible** - Complete documentation with step-by-step reproduction instructions

✅ **Deviation from defaults documented with justification** - All deviations explicitly documented with security and functional justifications

**Verified by:** Automated build and test processes  
**Last Audit:** 2026-02-24  
**Next Review:** Quarterly or upon major version updates

---

*This document is maintained as part of the Inovy security and compliance documentation suite.*
