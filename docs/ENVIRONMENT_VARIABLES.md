# Environment Variables Reference

This document lists all environment variables used by the Inovy application, organized by deployment target (Local, Vercel, Azure).

## Quick Reference

| Variable | Local | Vercel | Azure |
|----------|-------|--------|-------|
| **Database** | | | |
| `DATABASE_URL` | Required | Required | Set by Terraform |
| **Redis** | | | |
| `UPSTASH_REDIS_REST_URL` | Required | Required | — |
| `UPSTASH_REDIS_REST_TOKEN` | Required | Required | — |
| `REDIS_URL` | — | — | Required (ioredis) |
| **Blob Storage** | | | |
| `BLOB_READ_WRITE_TOKEN` | Required | Required | — |
| `BLOB_STORAGE_PROVIDER` | Optional | Optional | `azure` |
| `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER` | Optional | Optional | Build arg |
| `AZURE_STORAGE_ACCOUNT_NAME` | — | — | Set by Terraform |
| `AZURE_STORAGE_ACCOUNT_KEY` | — | — | Set by Terraform |
| `AZURE_STORAGE_CONNECTION_STRING` | — | — | Set by Terraform |
| `AZURE_STORAGE_CONTAINER_NAME` | — | — | Set by Terraform |
| **Platform** | | | |
| `NEXT_PUBLIC_PLATFORM` | Optional | `vercel` | `azure` |

---

## Local Development

Create `apps/web/.env.local` with the following variables.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon, local) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API token |
| `BETTER_AUTH_SECRET` | Better Auth secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Auth base URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `DEEPGRAM_API_KEY` | Deepgram API key for transcription |
| `QDRANT_URL` | Qdrant API URL (cloud or `http://localhost:6333`) |
| `QDRANT_API_KEY` | Qdrant API key (optional for local) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |
| `RESEND_API_KEY` | Resend API key for email |
| `RESEND_FROM_EMAIL` | From email (e.g. `noreply@yourdomain.com`) |

### Optional

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_PLATFORM` | Platform identifier (`vercel` default) |
| `BLOB_STORAGE_PROVIDER` | `azure` for Azure blob; omit for Vercel Blob |
| `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER` | Client-side blob provider (set if using Azure blob locally) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `HUGGINGFACE_API_KEY` | Hugging Face API key (reranker) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI (defaults to `{APP_URL}/api/integrations/google/callback`) |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret |
| `MICROSOFT_TENANT_ID` | Microsoft tenant ID (default: `common`) |
| `OAUTH_ENCRYPTION_KEY` | OAuth token encryption key (32 bytes hex) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `RECALL_API_KEY` | Recall.ai API key |
| `RECALL_WEBHOOK_SECRET` | Recall.ai webhook secret |
| `CRON_SECRET` | Secret for cron job authentication |
| `NEXT_PUBLIC_WEBHOOK_URL` | Public webhook URL for Google Drive |
| `NEXT_PUBLIC_KVK_NUMBER` | KVK number for legal pages |
| `ENABLE_ENCRYPTION_AT_REST` | `true` to encrypt recordings at rest |
| `ENCRYPTION_MASTER_KEY` | Master key for encryption (required if `ENABLE_ENCRYPTION_AT_REST=true`) |
| `LOG_LEVEL` | Log level (`debug`, `info`, `warn`, `error`) |
| `MODERATION_FAIL_CLOSED` | `true` to fail closed on moderation errors |
| `RATE_LIMIT_FREE_MAX_REQUESTS` | Rate limit for free tier |
| `RATE_LIMIT_PRO_MAX_REQUESTS` | Rate limit for pro tier |

---

## Vercel Deployment

Set these in the Vercel project **Environment Variables** (or via `vercel env`).

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API token |
| `BETTER_AUTH_SECRET` | Better Auth secret |
| `BETTER_AUTH_URL` | Production app URL (e.g. `https://app.inovico.nl`) |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `OPENAI_API_KEY` | OpenAI API key |
| `DEEPGRAM_API_KEY` | Deepgram API key |
| `QDRANT_URL` | Qdrant cloud URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (when using Vercel Blob) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | From email address |

### Vercel with Azure Blob Storage

When using Azure Blob on Vercel (instead of Vercel Blob):

| Variable | Description |
|----------|-------------|
| `BLOB_STORAGE_PROVIDER` | Set to `azure` |
| `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER` | Set to `azure` (client-side; must be `NEXT_PUBLIC_` for build) |
| `AZURE_STORAGE_ACCOUNT_NAME` | Azure storage account name |
| `AZURE_STORAGE_ACCOUNT_KEY` | Azure storage account key |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure storage connection string |
| `AZURE_STORAGE_CONTAINER_NAME` | Application storage container name (default: inovy). Contains folders: recordings/, gdpr-exports/, knowledge-base/ |

Omit `BLOB_READ_WRITE_TOKEN` when using Azure blob.

### Optional

Same optional variables as Local Development.

---

## Azure Container App

Environment variables are set by Terraform from GitHub secrets and variables. See [infrastructure/TERRAFORM_VARIABLES.md](../infrastructure/TERRAFORM_VARIABLES.md) for GitHub configuration.

### Set by Terraform (from outputs / variables)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | PostgreSQL Flexible Server connection string |
| `REDIS_URL` | Redis Container App URL (ioredis format) |
| `QDRANT_URL` | Qdrant API URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account name |
| `AZURE_STORAGE_ACCOUNT_KEY` | Storage account key |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage connection string |
| `AZURE_STORAGE_CONTAINER_NAME` | Application storage container name (inovy). Contains folders: recordings/, gdpr-exports/, knowledge-base/ |
| `BLOB_STORAGE_PROVIDER` | Always `azure` |
| `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER` | Always `azure` (client-side blob provider) |
| `NEXT_PUBLIC_PLATFORM` | `azure` (from `next_public_platform` var) |
| `NEXT_PUBLIC_APP_URL` | Derived from Container App URL |
| `BETTER_AUTH_URL` | Same as app URL |
| `NODE_ENV` | `production` for prd |

### From GitHub Secrets

| Variable | Secret |
|----------|--------|
| `OPENAI_API_KEY` | `OPENAI_API_KEY` |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` |
| `DEEPGRAM_API_KEY` | `DEEPGRAM_API_KEY` |
| `RECALL_API_KEY` | `RECALL_API_KEY` |
| `RECALL_WEBHOOK_SECRET` | `RECALL_WEBHOOK_SECRET` |
| `RESEND_API_KEY` | `RESEND_API_KEY` |
| `HUGGINGFACE_API_KEY` | `HUGGINGFACE_API_KEY` |
| `OAUTH_ENCRYPTION_KEY` | `OAUTH_ENCRYPTION_KEY` |
| `BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET` |
| `CRON_SECRET` | `CRON_SECRET` |
| `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` |
| `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_ID` |
| `MICROSOFT_CLIENT_SECRET` | `MICROSOFT_CLIENT_SECRET` |

### From GitHub Variables

| Variable | Variable |
|----------|----------|
| `RESEND_FROM_EMAIL` | `RESEND_FROM_EMAIL` |
| `NEXT_PUBLIC_WEBHOOK_URL` | `NEXT_PUBLIC_WEBHOOK_URL` |
| `NEXT_PUBLIC_KVK_NUMBER` | `NEXT_PUBLIC_KVK_NUMBER` |

### Docker Build Args (Azure)

For the client bundle to use Azure blob, the Docker build must receive `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER=azure`. This is typically set via `next.config.ts` injecting `BLOB_STORAGE_PROVIDER` into `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER`, or by passing it as a build arg in `.github/workflows/build-push-acr.yml`. Terraform also sets `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER=azure` as a Container App env var for runtime use.

---

## Platform-Specific Behavior

### Redis

- **Vercel / Local**: Uses Upstash Redis REST API (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- **Azure**: Uses ioredis with `REDIS_URL` (e.g. `redis://:password@host:port`).

### Blob Storage

- **Vercel Blob**: `BLOB_READ_WRITE_TOKEN`; `BLOB_STORAGE_PROVIDER` unset or `vercel`.
- **Azure Blob**: `BLOB_STORAGE_PROVIDER=azure` plus `AZURE_STORAGE_*` vars. Client needs `NEXT_PUBLIC_BLOB_STORAGE_PROVIDER=azure` at build time.

### Database

- **Vercel / Local**: Typically Neon or other serverless PostgreSQL (`DATABASE_URL`).
- **Azure**: PostgreSQL Flexible Server (`DATABASE_URL` from Terraform).

---

## Related Documentation

- [README.md](../README.md) – Local setup and quick start
- [infrastructure/DEPLOYMENT.md](../infrastructure/DEPLOYMENT.md) – Azure deployment guide
- [infrastructure/TERRAFORM_VARIABLES.md](../infrastructure/TERRAFORM_VARIABLES.md) – GitHub secrets and Terraform variables
