# Deployment Guidelines

This document provides comprehensive deployment guidelines for the Inovy application, ensuring secure, reliable, and compliant production deployments.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Procedures](#deployment-procedures)
- [Production Checklist](#production-checklist)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Deployment Overview

### Deployment Architecture

Inovy uses Vercel for serverless deployment with the following architecture:

```
┌─────────────────────────────────────────────────────────┐
│              Vercel Edge Network                        │
│    (Global CDN, DDoS Protection, SSL/TLS)               │
├─────────────────────────────────────────────────────────┤
│              Next.js Application                        │
│    (Serverless Functions, Edge Functions)               │
├─────────────────────────────────────────────────────────┤
│              External Services                          │
│    (Neon, Upstash, Qdrant, OpenAI, etc.)               │
└─────────────────────────────────────────────────────────┘
```

### Deployment Models

1. **Production Deployment**
   - Branch: `main`
   - Domain: `yourdomain.com`
   - Environment: Production
   - Auto-deployment: On push to main

2. **Preview Deployments**
   - Branches: Feature branches (e.g., `cursor/*`, `feature/*`)
   - Domain: Auto-generated preview URL
   - Environment: Preview
   - Auto-deployment: On push to any branch

3. **Local Development**
   - Environment: Development
   - Domain: `localhost:3000`
   - Hot reload: Enabled via Turbopack

---

### Deployment Flow

```
Developer Push to Branch
    ↓
GitHub Actions (CI/CD)
    ├── Lint and Type Check
    ├── Run Tests
    ├── Security Scan
    └── Build Application
        ↓
    Vercel Deployment
        ├── Build Next.js App
        ├── Deploy Serverless Functions
        ├── Deploy Edge Functions
        └── Update CDN Cache
            ↓
        Health Checks
            ├── Database Connectivity
            ├── Redis Cache
            ├── Qdrant Vector DB
            └── External APIs
                ↓
            ✅ Deployment Complete
```

---

## Prerequisites

### Required Accounts and Services

Before deployment, ensure you have:

1. **Vercel Account**
   - Team/Organization account (recommended for production)
   - Billing configured (Pro or Enterprise plan)
   - Domain configured and verified

2. **Database (Neon)**
   - Production PostgreSQL instance
   - Connection pooling enabled
   - Backups configured
   - Monitoring enabled

3. **Cache (Upstash Redis)**
   - Production Redis instance
   - Appropriate memory limits
   - Persistence enabled
   - TLS configured

4. **Vector Database (Qdrant)**
   - Production cluster (HA recommended)
   - API key authentication enabled
   - Backups configured
   - Same region as database (latency optimization)

5. **File Storage (Vercel Blob)**
   - Blob store created
   - Read/write token generated
   - Lifecycle policies configured (optional)

6. **Email Service (Resend)**
   - Account created
   - Domain verified (SPF, DKIM, DMARC)
   - API key generated
   - Webhook configured (optional)

7. **AI Services**
   - OpenAI: Production API key, usage limits set
   - Anthropic: API key (optional)
   - Deepgram: Production API key, usage monitored

8. **OAuth Providers (Optional)**
   - Google Cloud Console: OAuth credentials, redirect URIs configured
   - Azure AD: App registration, Graph API permissions granted

9. **Payment Processing (Optional)**
   - Stripe: Live API keys, webhook endpoint configured

10. **Version Control**
    - GitHub repository
    - Branch protection rules configured
    - CI/CD workflows set up

---

### Local Development Setup

Before first deployment, verify local setup works:

```bash
# 1. Clone repository
git clone <repository-url>
cd inovy

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your credentials

# 4. Setup database
pnpm db:push

# 5. Start development server
pnpm dev

# 6. Verify application works
open http://localhost:3000
```

---

## Environment Setup

### Vercel Project Configuration

#### 1. Create Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
cd /path/to/inovy
vercel link

# Follow prompts:
# - Select scope (team/personal)
# - Link to existing project or create new
# - Set root directory: ./
```

---

#### 2. Configure Environment Variables

**Via Vercel Dashboard:**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add all required variables from [CONFIGURATION.md](./CONFIGURATION.md)

**Environment Variable Scopes:**
- **Production**: Variables for production deployments (main branch)
- **Preview**: Variables for preview deployments (feature branches)
- **Development**: Variables for local development (`vercel dev`)

**Critical Variables to Set:**

```bash
# Production Environment
DATABASE_URL="postgresql://..." # Production database
UPSTASH_REDIS_REST_URL="https://..." # Production Redis
UPSTASH_REDIS_REST_TOKEN="..." # Production Redis token
BETTER_AUTH_SECRET="..." # Unique secret for production
BETTER_AUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
OPENAI_API_KEY="sk-proj-..." # Production key
DEEPGRAM_API_KEY="..." # Production key
QDRANT_URL="https://..." # Production Qdrant
QDRANT_API_KEY="..." # Production Qdrant key
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..." # Production token
RESEND_API_KEY="re_..." # Production key
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Preview Environment (can use same as production or separate staging services)
# ... similar variables with staging/preview values
```

**Using Vercel CLI:**

```bash
# Add environment variable
vercel env add VARIABLE_NAME

# Pull environment variables for local development
vercel env pull apps/web/.env.local
```

---

#### 3. Configure Build Settings

**Vercel Project Settings:**

```
Framework Preset: Next.js
Root Directory: ./
Build Command: cd apps/web && pnpm build
Output Directory: apps/web/.next
Install Command: pnpm install
Development Command: pnpm dev
```

**Build Configuration:**
- Node.js Version: 20.x (automatic detection from `package.json`)
- Build timeout: 15 minutes (default, adjust if needed)
- Function region: `iad1` (or closest to your database region)
- Function size: 50MB (default, increase if needed)

---

#### 4. Configure Domain

**Custom Domain Setup:**

1. **Add Domain in Vercel:**
   - Go to Settings → Domains
   - Add your custom domain (e.g., `inovy.yourdomain.com`)
   - Vercel provides DNS records

2. **Configure DNS:**
   - Add CNAME record: `inovy.yourdomain.com` → `cname.vercel-dns.com`
   - Or A record: Point to Vercel IP (provided by Vercel)
   - Wait for DNS propagation (up to 48 hours)

3. **SSL Certificate:**
   - Automatic via Vercel (Let's Encrypt)
   - Certificate provisioned within minutes
   - Automatic renewal (no action required)

4. **Redirect Configuration:**
   - Redirect www to non-www (or vice versa)
   - Configure in Vercel domain settings
   - HTTP to HTTPS redirect (automatic)

---

### Database Migrations

**Migration Strategy:**

⚠️ **IMPORTANT**: Never run migrations manually in production. Always use GitHub Actions workflow.

**Automated Migration Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Manual Migration (Development/Staging Only):**

```bash
# 1. Generate migration
pnpm db:generate --name add_new_feature

# 2. Review migration SQL
cat apps/web/src/server/db/migrations/XXXX_add_new_feature.sql

# 3. Test in development
pnpm db:push # Development only

# 4. Commit migration files
git add apps/web/src/server/db/migrations/
git commit -m "feat: add new feature migration"

# 5. Push to trigger automated deployment
git push
```

**Migration Best Practices:**
- Always review generated SQL before applying
- Test migrations in staging environment first
- Create reversible migrations when possible
- Backup database before major schema changes
- Monitor application during and after migration
- Have rollback plan ready

---

## Deployment Procedures

### Development Workflow

**Feature Branch Deployment:**

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Develop and test locally
pnpm dev

# 3. Commit changes
git add .
git commit -m "feat: implement new feature"

# 4. Push to GitHub
git push origin feature/new-feature

# 5. Automatic preview deployment triggered
# Vercel creates preview URL: https://inovy-xxx-yourusername.vercel.app

# 6. Test preview deployment
# Share preview URL with team for review

# 7. Create pull request
gh pr create --title "Feature: New Feature" --body "Description..."

# 8. Code review and approval

# 9. Merge to main (triggers production deployment)
gh pr merge --auto --squash
```

**Preview Deployment Benefits:**
- Isolated environment for testing
- Automatic deployment on every push
- Unique URL for each branch
- Production-like environment
- No impact on production

---

### Production Deployment

**Production Deployment Process:**

```bash
# 1. Ensure all tests pass
pnpm typecheck
pnpm lint
pnpm test # If tests exist

# 2. Merge to main branch
git checkout main
git pull origin main
git merge feature/new-feature

# 3. Push to main (triggers deployment)
git push origin main

# 4. Monitor deployment in Vercel dashboard
# Vercel dashboard: https://vercel.com/your-team/inovy

# 5. Verify deployment succeeded
curl https://yourdomain.com/api/health

# 6. Smoke test critical functionality
# - User authentication
# - Project creation
# - Recording upload
# - AI processing

# 7. Monitor for errors
# Check Vercel logs and error tracking
```

**Automatic Deployment Features (Vercel):**
- Zero-downtime deployment
- Automatic rollback on build failure
- Instant cache invalidation
- Edge network propagation
- Health checks before traffic routing

---

### First-Time Production Deployment

**Step-by-Step Guide:**

#### Step 1: Prepare Vercel Project

```bash
# 1. Create Vercel project (if not exists)
vercel

# 2. Configure production environment variables
# Via Vercel dashboard: Settings → Environment Variables
# Or via CLI:
vercel env add DATABASE_URL production
vercel env add UPSTASH_REDIS_REST_URL production
# ... add all required variables
```

---

#### Step 2: Database Setup

```bash
# 1. Create production database (Neon)
# - Go to https://console.neon.tech/
# - Create new project
# - Copy connection string

# 2. Configure database
# - Enable connection pooling
# - Set up automated backups (daily)
# - Configure retention (30 days recommended)

# 3. Set DATABASE_URL in Vercel
vercel env add DATABASE_URL production
# Paste connection string when prompted

# 4. Run initial migration
# Option A: GitHub Actions (recommended)
# - Push migrations to main branch
# - GitHub Actions runs migrations automatically

# Option B: Manual (one-time setup only)
# - Temporarily set DATABASE_URL locally
# - Run: pnpm db:push
# - Remove local DATABASE_URL
```

---

#### Step 3: Configure Services

**Redis (Upstash):**

```bash
# 1. Create Upstash Redis database
# - Go to https://console.upstash.com/
# - Create new database
# - Select region closest to Vercel deployment

# 2. Configure environment variables
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

**Qdrant (Vector Database):**

```bash
# 1. Create Qdrant Cloud cluster
# - Go to https://qdrant.io/
# - Create production cluster (HA recommended)
# - Select region matching database

# 2. Configure environment variables
vercel env add QDRANT_URL production
vercel env add QDRANT_API_KEY production

# 3. Initialize collections (one-time)
# Collections are created automatically on first use
# Or run initialization script:
pnpm index-project
```

**Vercel Blob:**

```bash
# 1. Create Blob store (automatic with Vercel Pro/Enterprise)
# - Navigate to Storage in Vercel dashboard
# - Create new Blob store

# 2. Copy read/write token
vercel env add BLOB_READ_WRITE_TOKEN production
```

**AI Services:**

```bash
# Configure API keys
vercel env add OPENAI_API_KEY production
vercel env add ANTHROPIC_API_KEY production # Optional
vercel env add DEEPGRAM_API_KEY production
```

**Email Service (Resend):**

```bash
# 1. Create Resend account and verify domain
# - Go to https://resend.com/
# - Add domain and configure DNS records (SPF, DKIM, DMARC)

# 2. Configure environment variables
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
```

**OAuth Providers (Optional):**

```bash
# Google OAuth
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production

# Microsoft OAuth
vercel env add MICROSOFT_CLIENT_ID production
vercel env add MICROSOFT_CLIENT_SECRET production
vercel env add MICROSOFT_TENANT_ID production
```

**Stripe (Optional):**

```bash
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

---

#### Step 4: Configure Authentication

```bash
# 1. Generate Better Auth secret
SECRET=$(openssl rand -base64 32)

# 2. Set authentication variables
vercel env add BETTER_AUTH_SECRET production
# Paste the generated secret when prompted

vercel env add BETTER_AUTH_URL production
# Enter: https://yourdomain.com

vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://yourdomain.com
```

**Configure OAuth Redirect URIs:**

**Google Cloud Console:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit OAuth 2.0 Client ID
4. Add Authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

**Azure AD:**
1. Go to [portal.azure.com](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Select your application
4. Add Redirect URI: `https://yourdomain.com/api/auth/callback/microsoft`

---

#### Step 5: Configure Security Headers

Update `vercel.json` with security headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https://*.vercel.app https://*.qdrant.io; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
        }
      ]
    }
  ],
  "crons": [
    {
      "path": "/api/cron/renew-drive-watches",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/monitor-calendar",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/poll-bot-status",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

#### Step 6: Deploy to Production

```bash
# 1. Deploy to production
vercel --prod

# 2. Monitor deployment
# Watch Vercel dashboard for build progress

# 3. Verify deployment
curl https://yourdomain.com

# 4. Test critical functionality
# - Sign in
# - Create project
# - Upload recording
# - Check AI processing

# 5. Monitor for errors
# Check Vercel logs and error rates
```

---

### Subsequent Deployments

**Standard Deployment Process:**

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes and test locally
pnpm dev

# 3. Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature

# 4. Preview deployment automatic
# Vercel creates preview at: https://inovy-<hash>-<user>.vercel.app

# 5. Test preview deployment thoroughly

# 6. Create and merge PR
gh pr create
gh pr merge --auto --squash

# 7. Production deployment automatic
# Vercel deploys to https://yourdomain.com

# 8. Verify production
curl https://yourdomain.com/api/health
```

**Automatic Deployment Triggers:**
- **Production**: Push to `main` branch
- **Preview**: Push to any other branch
- **Build cache**: Intelligent caching for faster builds
- **Zero downtime**: Traffic shifted atomically

---

## Production Checklist

### Pre-Deployment Checklist

**Code Quality:**
- [ ] All tests passing
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] No console.log or debug code in production
- [ ] Security scan completed (no critical vulnerabilities)

**Configuration:**
- [ ] All required environment variables set
- [ ] Production URLs configured (no localhost)
- [ ] Secrets generated securely (not test/placeholder values)
- [ ] OAuth redirect URIs updated for production domain
- [ ] Email domain verified (SPF, DKIM, DMARC)

**Database:**
- [ ] Production database created and accessible
- [ ] Connection pooling enabled
- [ ] Backups configured (daily minimum)
- [ ] SSL/TLS enabled
- [ ] Migrations ready to apply

**Services:**
- [ ] Redis cache configured and tested
- [ ] Qdrant vector database initialized
- [ ] File storage (Blob) configured
- [ ] Email service domain verified
- [ ] AI services configured with production keys

**Security:**
- [ ] Security headers configured in `vercel.json`
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Rate limiting configured
- [ ] CORS policy set correctly
- [ ] Authentication tested end-to-end
- [ ] Authorization rules verified

**Monitoring:**
- [ ] Error tracking configured (Vercel Analytics)
- [ ] Log aggregation enabled
- [ ] Uptime monitoring set up
- [ ] Alert channels configured (email, Slack)
- [ ] Performance monitoring enabled (Vercel Speed Insights)

---

### Post-Deployment Checklist

**Functional Testing:**
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works (all methods)
- [ ] OAuth providers work (Google, Microsoft)
- [ ] Project creation successful
- [ ] Recording upload successful
- [ ] AI processing (transcription, summary, tasks) works
- [ ] Real-time features functional
- [ ] Email sending works

**Security Testing:**
- [ ] HTTPS enforced (HTTP redirects)
- [ ] Security headers present (check with curl -I)
- [ ] Authentication required for protected routes
- [ ] Authorization enforced (test with different roles)
- [ ] Rate limiting active (test with burst requests)
- [ ] CORS policy enforced

**Performance Testing:**
- [ ] Page load time acceptable (< 3 seconds)
- [ ] API response times acceptable (< 500ms)
- [ ] Database queries optimized
- [ ] Cache hit rate monitored
- [ ] CDN serving static assets
- [ ] Core Web Vitals within targets

**Monitoring Verification:**
- [ ] Logs flowing to Vercel dashboard
- [ ] Error tracking capturing exceptions
- [ ] Performance metrics visible
- [ ] Alerts configured and tested
- [ ] Uptime monitoring active

---

### Deployment Verification Script

Create and run a deployment verification script:

```bash
#!/bin/bash
# scripts/verify-deployment.sh

DOMAIN="https://yourdomain.com"

echo "🔍 Verifying deployment..."

# Test homepage
echo "Testing homepage..."
curl -f -s $DOMAIN > /dev/null && echo "✅ Homepage OK" || echo "❌ Homepage failed"

# Test API health endpoint
echo "Testing API health..."
curl -f -s $DOMAIN/api/health > /dev/null && echo "✅ API OK" || echo "❌ API failed"

# Test authentication endpoint
echo "Testing authentication..."
curl -f -s $DOMAIN/api/auth/session > /dev/null && echo "✅ Auth OK" || echo "❌ Auth failed"

# Check security headers
echo "Checking security headers..."
curl -I -s $DOMAIN | grep -q "X-Content-Type-Options" && echo "✅ Security headers OK" || echo "⚠️ Security headers missing"

# Check HTTPS redirect
echo "Testing HTTPS redirect..."
curl -I -s http://${DOMAIN#https://} | grep -q "301\|302" && echo "✅ HTTPS redirect OK" || echo "⚠️ HTTPS redirect not configured"

echo "✅ Deployment verification complete"
```

Run after deployment:

```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

---

## Monitoring and Maintenance

### Application Monitoring

**Vercel Analytics:**
- Real-time visitor analytics
- Performance metrics (Web Vitals)
- Geographical distribution
- Browser and device statistics

**Vercel Speed Insights:**
- Core Web Vitals tracking
- Real User Monitoring (RUM)
- Performance scoring
- Optimization recommendations

**Log Monitoring:**
- Real-time log streaming
- Error aggregation and grouping
- Search and filter capabilities
- Export logs for analysis

**Monitoring Dashboard:**

Access monitoring in Vercel:
1. Go to your project dashboard
2. Navigate to Analytics tab for traffic insights
3. Navigate to Speed Insights for performance
4. Navigate to Logs for real-time logging

---

### Error Tracking

**Error Monitoring:**
- Automatic error capture in Vercel logs
- Error aggregation by type
- Stack traces for debugging
- Source map support for production errors

**Error Response Flow:**

```
Error Occurs
    ↓
Error Boundary Catches (React)
    ↓
Log Error Server-Side (Pino)
    ↓
Send to Vercel Logs
    ↓
Alert on Critical Errors
    ↓
Display Generic Error to User
```

**Error Severity Levels:**

| Severity | Examples | Response |
|----------|----------|----------|
| **Critical** | Database down, authentication failure, data loss | Immediate alert, incident response |
| **High** | Service degradation, API errors, payment failures | Alert within 15 minutes |
| **Medium** | Non-critical feature failure, integration issues | Daily review |
| **Low** | UI glitches, non-critical warnings | Weekly review |

---

### Performance Monitoring

**Key Metrics:**

| Metric | Target | Monitoring |
|--------|--------|------------|
| **Largest Contentful Paint (LCP)** | < 2.5s | Vercel Speed Insights |
| **First Input Delay (FID)** | < 100ms | Vercel Speed Insights |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Vercel Speed Insights |
| **Time to First Byte (TTFB)** | < 600ms | Vercel Analytics |
| **API Response Time (p95)** | < 500ms | Custom monitoring |
| **Database Query Time (p95)** | < 100ms | Neon metrics |
| **Cache Hit Rate** | > 80% | Redis metrics |

**Performance Optimization:**
- Server Components for zero client JS
- Streaming with Suspense boundaries
- Optimistic UI updates
- Incremental Static Regeneration (ISR)
- Edge caching for static assets
- Image optimization with Next.js Image

---

### Database Monitoring

**Neon Metrics:**
- Connection count and pool usage
- Query latency (p50, p95, p99)
- Database size and growth rate
- Active queries and slow queries
- Backup status and recovery time

**Monitoring Alerts:**
- Connection pool exhaustion (> 80% usage)
- Slow queries (> 1 second)
- Database size approaching limit
- Backup failure
- Connection errors spike

**Database Maintenance:**
- Weekly: Review slow query log
- Monthly: Analyze query patterns and optimize indexes
- Quarterly: Review and archive old data
- Yearly: Database capacity planning

---

### Cache Monitoring

**Redis Metrics:**
- Hit/miss ratio (target: > 80% hit rate)
- Memory usage (alert at 80% capacity)
- Eviction rate (high evictions indicate memory pressure)
- Connection count
- Command latency

**Cache Optimization:**
- Adjust TTL based on data volatility
- Implement cache warming for critical data
- Monitor frequently accessed keys
- Optimize cache key structure
- Implement cache strategies (write-through, write-behind)

**Cache Health Endpoint:**

```bash
# Check cache health
curl https://yourdomain.com/api/cache/health

# Expected response
{
  "status": "healthy",
  "connected": true,
  "latency": "5ms",
  "hitRate": "85%"
}
```

---

### Cron Job Monitoring

**Configured Cron Jobs:**

| Job | Schedule | Purpose | Expected Duration |
|-----|----------|---------|-------------------|
| `renew-drive-watches` | Daily 00:00 UTC | Renew Google Drive webhook watches | < 1 minute |
| `monitor-calendar` | Daily 00:00 UTC | Check for upcoming calendar events | < 2 minutes |
| `poll-bot-status` | Daily 00:00 UTC | Poll Recall.ai bot status | < 1 minute |

**Monitoring:**
- Cron execution logs in Vercel dashboard
- Alert on failures (2 consecutive failures)
- Monitor execution duration
- Check for errors in logs

**Cron Job Best Practices:**
- Idempotent operations (safe to retry)
- Timeout configured (5 minutes max)
- Error handling and logging
- Rate limiting exemption for cron endpoints
- Authentication (verify cron header from Vercel)

---

### Security Monitoring

**Security Events to Monitor:**

**Authentication Events:**
- Failed login attempts (alert on 10+ failures in 10 minutes)
- Account lockouts
- Password resets
- New device logins
- OAuth authorization errors

**Authorization Events:**
- Access denied events (alert on repeated denials)
- Permission changes
- Role changes
- Organization membership changes

**Suspicious Activity:**
- Rapid API requests from single IP (potential scraping/abuse)
- Unusual data access patterns
- Large file uploads
- Geographic anomalies (impossible travel)
- Session hijacking attempts

**Security Alerts:**
- Critical: Immediate (phone, PagerDuty)
- High: 15 minutes (Slack, email)
- Medium: 1 hour (email)
- Low: Daily digest

---

## Rollback Procedures

### Automatic Rollback

Vercel provides instant rollback capabilities:

**Via Vercel Dashboard:**
1. Go to Deployments tab
2. Find previous successful deployment
3. Click three dots (⋯) → Promote to Production
4. Confirm promotion
5. Traffic switches instantly (< 1 minute)

**Via Vercel CLI:**

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Or rollback to specific deployment
vercel rollback <deployment-url>
```

**Rollback Scenarios:**
- Build failure: Automatic (deployment not promoted)
- Runtime errors: Manual rollback
- Performance degradation: Manual rollback
- Security incident: Immediate manual rollback

---

### Manual Rollback

**Git-Based Rollback:**

```bash
# 1. Identify last working commit
git log --oneline -10

# 2. Create hotfix branch from last working commit
git checkout -b hotfix/rollback <last-working-commit>

# 3. Push hotfix branch
git push origin hotfix/rollback

# 4. Promote hotfix preview to production
# Via Vercel dashboard: Find hotfix preview → Promote to Production

# Or merge hotfix to main
git checkout main
git merge hotfix/rollback
git push origin main
```

**Database Rollback:**

⚠️ **CAUTION**: Database rollbacks are complex and risky.

**Schema Rollback:**
1. Identify migration to rollback
2. Create reverse migration
3. Test reverse migration in staging
4. Apply to production during maintenance window
5. Verify data integrity

**Data Rollback:**
1. Use point-in-time recovery (Neon supports this)
2. Restore to specific timestamp before issue
3. Verify data consistency
4. Coordinate with application rollback

**Best Practice:** 
- Create reversible migrations when possible
- Test rollback procedures in staging
- Have data backup before schema changes
- Plan rollback strategy before deployment

---

### Emergency Procedures

**Service Outage Response:**

**Step 1: Assess Situation**
- Check Vercel status page: [vercel-status.com](https://vercel-status.com)
- Check service provider status pages (Neon, Upstash, Qdrant)
- Review error logs and metrics
- Determine scope and severity

**Step 2: Communicate**
- Notify status page subscribers
- Update internal team (Slack/Teams)
- Prepare customer communication if needed

**Step 3: Mitigate**
- Rollback to last working version if application issue
- Enable maintenance mode if extended downtime expected
- Switch to backup services if provider outage
- Scale resources if capacity issue

**Step 4: Resolve**
- Fix root cause
- Deploy fix to production
- Verify resolution
- Monitor closely for 24 hours

**Step 5: Post-Mortem**
- Document incident timeline
- Identify root cause
- Action items to prevent recurrence
- Update runbooks and procedures

---

**Maintenance Mode:**

Enable maintenance mode by setting environment variable:

```bash
vercel env add MAINTENANCE_MODE production
# Set value: "true"
```

Application should check this variable and show maintenance page:

```typescript
// In root layout or middleware
if (process.env.MAINTENANCE_MODE === "true") {
  return <MaintenancePage />;
}
```

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Issue: Type errors during build**
```bash
# Symptoms: Build fails with TypeScript errors
# Solution:
pnpm typecheck # Fix all type errors locally first
git commit -am "fix: resolve type errors"
git push
```

**Issue: Missing dependencies**
```bash
# Symptoms: Build fails with "Cannot find module"
# Solution:
pnpm install # Ensure dependencies installed locally
git add pnpm-lock.yaml # Commit lockfile
git push
```

**Issue: Environment variable not available during build**
```bash
# Symptoms: Build fails with "process.env.X is undefined"
# Solution:
# Ensure variable is set in Vercel for correct environment
# Prefix client variables with NEXT_PUBLIC_
vercel env add NEXT_PUBLIC_VAR_NAME production
```

---

#### Runtime Issues

**Issue: Database connection timeout**
```bash
# Symptoms: "Error: connection timeout" in logs
# Cause: Database unreachable or wrong connection string
# Solution:
# 1. Verify DATABASE_URL is correct
vercel env ls
# 2. Check Neon dashboard for database status
# 3. Verify IP allowlist if configured
# 4. Check connection pooling enabled
```

**Issue: Redis connection failure**
```bash
# Symptoms: "Redis connection failed" in logs
# Cause: Invalid Redis URL or token
# Solution:
# 1. Verify Upstash Redis credentials
vercel env ls
# 2. Test connectivity:
curl https://yourdomain.com/api/cache/health
# 3. Check Upstash dashboard for instance status
```

**Issue: OAuth redirect mismatch**
```bash
# Symptoms: "redirect_uri_mismatch" error during OAuth
# Cause: Redirect URI not configured in OAuth provider
# Solution:
# 1. Get actual redirect URI from error message
# 2. Add to OAuth provider console:
#    Google: console.cloud.google.com
#    Microsoft: portal.azure.com
# 3. URI format: https://yourdomain.com/api/auth/callback/[provider]
```

**Issue: File upload fails**
```bash
# Symptoms: "Failed to upload file" or 413 Payload Too Large
# Cause: Body size limit or Blob token issue
# Solution:
# 1. Verify body size limit in next.config.ts (500MB configured)
# 2. Check BLOB_READ_WRITE_TOKEN is set correctly
vercel env get BLOB_READ_WRITE_TOKEN production
# 3. Verify Vercel Blob store exists and has quota
```

**Issue: AI processing fails**
```bash
# Symptoms: Recordings stuck in processing state
# Cause: Invalid API keys or quota exceeded
# Solution:
# 1. Check AI service API keys
vercel env get OPENAI_API_KEY production
vercel env get DEEPGRAM_API_KEY production
# 2. Check quota and usage in service dashboards
# 3. Check workflow status in Vercel dashboard
# 4. Review logs for specific error messages
```

---

#### Performance Issues

**Issue: Slow page load times**
```bash
# Diagnosis:
# 1. Check Vercel Speed Insights for bottlenecks
# 2. Review database query performance (Neon metrics)
# 3. Check cache hit rates (Redis metrics)
# 4. Analyze bundle size

# Solutions:
# - Optimize database queries (add indexes)
# - Increase cache TTL for stable data
# - Enable ISR for static pages
# - Use dynamic imports for heavy components
# - Optimize images (use next/image)
```

**Issue: High API latency**
```bash
# Diagnosis:
# Check Vercel function logs for execution time
# Identify slow database queries
# Check external API response times

# Solutions:
# - Add database indexes for slow queries
# - Implement request caching
# - Use edge functions for simple operations
# - Optimize algorithm efficiency
# - Consider read replicas for database
```

**Issue: Database connection pool exhausted**
```bash
# Symptoms: "too many clients" error
# Cause: Too many concurrent database connections
# Solutions:
# - Use Neon connection pooling URL
# - Reduce connection timeout
# - Implement connection pooling at application level
# - Scale database if needed
```

---

### Monitoring and Debugging

**Vercel Logs:**

```bash
# Real-time log streaming
vercel logs --follow

# Filter logs by type
vercel logs --filter "error"

# View logs for specific deployment
vercel logs <deployment-url>

# Export logs for analysis
vercel logs --output logs.txt
```

**Database Debugging:**

```bash
# Connect to production database (carefully!)
psql $DATABASE_URL

# Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;

# Check connection count
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('inovy'));
```

**Redis Debugging:**

```bash
# Via API endpoint
curl https://yourdomain.com/api/cache/health

# View cache statistics
curl https://yourdomain.com/api/cache/stats
```

**Qdrant Debugging:**

```bash
# Check Qdrant health
curl https://yourdomain.com/api/qdrant/health

# List collections
curl https://yourdomain.com/api/qdrant/collections

# Check collection stats
curl https://yourdomain.com/api/qdrant/collections/knowledge_base
```

---

### Maintenance Windows

**Planned Maintenance:**

1. **Schedule maintenance**: Off-peak hours (e.g., Sunday 2-4 AM UTC)
2. **Notify users**: 48 hours advance notice minimum
3. **Enable maintenance mode**: Display maintenance page
4. **Perform maintenance**: Database updates, migrations, etc.
5. **Verify functionality**: Run full test suite
6. **Disable maintenance mode**: Restore normal operation
7. **Monitor closely**: Watch for issues post-maintenance

**Maintenance Window Template:**

```
Subject: Scheduled Maintenance - [Date]

Dear Inovy Users,

We will be performing scheduled maintenance on [Date] from [Time] to [Time] UTC.

During this time:
- Application will be unavailable
- All data is safe and backed up
- No action required from you

We apologize for any inconvenience.

Best regards,
Inovy Team
```

---

## Security Compliance for Production

### Pre-Deployment Security Audit

**Security Checklist:**

**Authentication & Authorization:**
- [ ] All authentication methods tested
- [ ] Session management verified (secure cookies, expiration)
- [ ] RBAC enforced across all resources
- [ ] Admin interface properly restricted
- [ ] OAuth configured with minimal scopes

**Data Protection:**
- [ ] Database encryption at rest enabled (Neon TDE)
- [ ] TLS 1.3 configured for all connections
- [ ] File encryption at rest enabled (Vercel Blob)
- [ ] Redis encryption enabled (Upstash TLS)
- [ ] Backup encryption verified

**Network Security:**
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers configured (all required headers)
- [ ] CORS policy restrictive (no wildcards)
- [ ] Rate limiting active (per-tier limits)
- [ ] Firewall rules configured (if applicable)

**Application Security:**
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] SQL injection prevention verified (Drizzle parameterized queries)
- [ ] XSS prevention tested (React escaping, CSP)
- [ ] CSRF protection enabled (SameSite cookies)
- [ ] Path traversal prevention (no user-controlled paths)

**Logging & Monitoring:**
- [ ] Audit logging enabled (all critical actions)
- [ ] Error logging configured (structured logs)
- [ ] Security monitoring active (anomaly detection)
- [ ] Alerts configured (critical, high, medium)
- [ ] Incident response plan documented

---

### Post-Deployment Security Verification

**Security Testing:**

```bash
# 1. Verify security headers
curl -I https://yourdomain.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security|Content-Security-Policy"

# Expected output:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Content-Security-Policy: default-src 'self'; ...

# 2. Test HTTPS enforcement
curl -I http://yourdomain.com
# Expected: 301/302 redirect to https://

# 3. Test authentication
curl https://yourdomain.com/api/protected-endpoint
# Expected: 401 Unauthorized

# 4. Test rate limiting
for i in {1..20}; do curl https://yourdomain.com/api/endpoint; done
# Expected: 429 Too Many Requests after limit

# 5. SSL/TLS test
openssl s_client -connect yourdomain.com:443 -tls1_3
# Verify TLS 1.3 connection succeeds
```

**Automated Security Scan:**

Use online security scanners:
- [securityheaders.com](https://securityheaders.com) - Grade A target
- [ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/) - A+ rating target
- [observatory.mozilla.org](https://observatory.mozilla.org) - A+ rating target

---

## Deployment Environments

### Environment Configuration Matrix

| Setting | Development | Preview | Production |
|---------|-------------|---------|------------|
| **Domain** | localhost:3000 | Auto-generated | yourdomain.com |
| **Database** | Development DB | Staging DB (optional) | Production DB |
| **Redis** | Dev instance | Staging instance | Production instance |
| **API Keys** | Test/sandbox keys | Test/sandbox keys | Production keys |
| **LOG_LEVEL** | debug | info | info/warn |
| **NODE_ENV** | development | production | production |
| **Caching** | Disabled/short TTL | Enabled | Enabled/optimized |
| **Source Maps** | Enabled | Enabled | Disabled |
| **Error Details** | Full details | Generic messages | Generic messages |
| **Rate Limits** | Lenient | Standard | Strict |

---

### Environment Variable Management

**Per-Environment Configuration:**

**Production Variables (main branch):**
```bash
# Set production-only variables
vercel env add VARIABLE_NAME production

# Example: Production database
vercel env add DATABASE_URL production
# Enter: postgresql://prod-user:prod-pass@prod-host/prod-db
```

**Preview Variables (feature branches):**
```bash
# Set preview-only variables (optional, can share with production)
vercel env add DATABASE_URL preview

# Or inherit from production (default behavior)
```

**Development Variables:**
```bash
# Pull variables for local development
vercel env pull apps/web/.env.local

# Or manually create apps/web/.env.local
```

**Variable Inheritance:**
- Preview inherits from Production (unless overridden)
- Development pulls from Preview or Production
- Secrets never pulled (must be set manually locally)

---

## Advanced Deployment Topics

### Blue-Green Deployment

Vercel implements blue-green deployment automatically:

**How It Works:**
1. New version deployed to staging environment (green)
2. Health checks performed automatically
3. If healthy, traffic switched atomically to green
4. Previous version (blue) kept for instant rollback
5. Blue decommissioned after 30 minutes (configurable)

**Benefits:**
- Zero downtime
- Instant rollback capability
- Safe deployment with automated health checks
- No user impact during deployment

---

### Edge Functions

**When to Use Edge Functions:**
- Authentication checks
- A/B testing
- Geolocation-based routing
- Simple data transformations
- Bot detection

**Edge Function Deployment:**

```typescript
// app/api/edge-example/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  // Edge function code (limited Node.js APIs)
  return new Response('Hello from Edge');
}
```

**Edge Function Limitations:**
- No access to Node.js filesystem APIs
- No access to native modules
- Limited to Edge-compatible packages
- Max execution time: 30 seconds

---

### Serverless Function Configuration

**Function Settings:**

```typescript
// app/api/function/route.ts
export const runtime = 'nodejs'; // Default
export const maxDuration = 60; // Max 60 seconds (Pro/Enterprise)

export async function POST(request: Request) {
  // Long-running operation (AI processing, etc.)
}
```

**Function Limits:**

| Plan | Max Duration | Memory | Size |
|------|-------------|--------|------|
| **Hobby** | 10 seconds | 1024 MB | 50 MB |
| **Pro** | 60 seconds | 1024 MB | 50 MB |
| **Enterprise** | 900 seconds | 3000 MB | 250 MB |

**Best Practices:**
- Use Vercel Workflow for long-running operations (AI processing)
- Optimize function size (exclude unnecessary dependencies)
- Use Edge Functions for fast, simple operations
- Monitor function execution time and memory

---

### Database Deployment

**Migration Workflow:**

**GitHub Actions (Recommended):**

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/src/server/db/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Migration Best Practices:**
- Test migrations in staging first
- Backup database before schema changes
- Use transactions for reversible migrations
- Monitor application during migration
- Plan rollback strategy
- Schedule during low-traffic periods for major changes

---

### Monitoring Setup

**Vercel Integrations:**

1. **Vercel Analytics**: Enabled by default
2. **Speed Insights**: Add `@vercel/speed-insights` package
3. **Error Tracking**: Built-in to Vercel platform

**External Monitoring (Optional):**

**Uptime Monitoring:**
- UptimeRobot, Pingdom, or similar
- Monitor main domain and critical API endpoints
- Alert on downtime (>1 minute)

**APM (Application Performance Monitoring):**
- Datadog, New Relic, or similar (Enterprise plan)
- Detailed performance traces
- Database query monitoring
- Error aggregation and analysis

**Log Management:**
- Vercel Logs (built-in)
- Export to external service for long-term retention
- Datadog, Splunk, or ELK stack (for large scale)

---

## Deployment Strategy

### Release Management

**Release Process:**

1. **Version Tagging:**
```bash
# Create release tag
git tag -a v1.0.0 -m "Release v1.0.0: Feature description"
git push origin v1.0.0
```

2. **Release Notes:**
   - Document new features
   - List bug fixes
   - Note breaking changes
   - Include migration instructions if needed

3. **Release Communication:**
   - Notify users of new features
   - Provide upgrade instructions
   - Highlight security updates

**Release Schedule:**
- **Hotfixes**: As needed (security, critical bugs)
- **Minor releases**: Bi-weekly (features, non-critical fixes)
- **Major releases**: Quarterly (breaking changes, major features)

---

### Feature Flags (Future Enhancement)

**Feature Flag Strategy:**

```typescript
// lib/feature-flags.ts
export const featureFlags = {
  newChatInterface: process.env.FEATURE_NEW_CHAT === 'true',
  advancedAnalytics: process.env.FEATURE_ANALYTICS === 'true',
  betaFeatures: process.env.FEATURE_BETA === 'true',
};

// Usage in components
if (featureFlags.newChatInterface) {
  return <NewChatInterface />;
} else {
  return <OldChatInterface />;
}
```

**Benefits:**
- Deploy features before release (dark launch)
- Gradual rollout (percentage-based)
- A/B testing
- Quick disable if issues found
- Organization-specific features

---

### Continuous Integration/Continuous Deployment (CI/CD)

**GitHub Actions Workflows:**

**Build and Test:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Type check
        run: pnpm typecheck
      
      - name: Lint
        run: pnpm lint
      
      - name: Security audit
        run: pnpm audit
```

**CI/CD Best Practices:**
- Run on all pull requests
- Block merge on failures
- Include security scanning
- Cache dependencies for speed
- Parallel job execution
- Fail fast on errors

---

## Production Deployment Checklist

### Pre-Go-Live Checklist

**Infrastructure:**
- [ ] Production database created and configured
- [ ] Redis cache deployed and tested
- [ ] Qdrant vector database initialized
- [ ] File storage (Blob) configured
- [ ] Email service configured and domain verified
- [ ] CDN enabled and configured
- [ ] DNS configured and propagated

**Application:**
- [ ] All environment variables set
- [ ] Security headers configured
- [ ] Error tracking enabled
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Alerting configured

**Security:**
- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] Vulnerability scan clean
- [ ] Security headers verified (A grade)
- [ ] SSL/TLS configured (A+ rating)
- [ ] Authentication tested thoroughly
- [ ] Authorization rules verified
- [ ] Rate limiting active

**Compliance:**
- [ ] GDPR compliance verified
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] Data processing agreements signed
- [ ] DPIA completed (if required)

**Performance:**
- [ ] Load testing completed
- [ ] Performance targets met (Core Web Vitals)
- [ ] Database indexes optimized
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets

**Operations:**
- [ ] Backup and recovery tested
- [ ] Incident response plan documented
- [ ] Runbooks created for common issues
- [ ] On-call rotation established
- [ ] Escalation procedures documented

**Documentation:**
- [ ] Configuration documented ([CONFIGURATION.md](./CONFIGURATION.md))
- [ ] Security guidelines documented ([SECURITY.md](./SECURITY.md))
- [ ] Deployment procedures documented (this file)
- [ ] User documentation published
- [ ] API documentation published

---

### Go-Live Procedure

**Day Before:**
1. Final security review
2. Backup all systems
3. Notify team of go-live schedule
4. Prepare rollback plan
5. Verify monitoring and alerting
6. Test rollback procedure in staging

**Go-Live Day:**

```bash
# Hour 0: Final preparation
- [ ] Team on standby
- [ ] Monitoring dashboards open
- [ ] Communication channels ready
- [ ] Rollback plan reviewed

# Hour 0: Deploy
git checkout main
git pull origin main
git merge release/v1.0.0
git push origin main
# Vercel deploys automatically

# Hour 0-1: Monitor closely
- [ ] Watch Vercel deployment status
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify critical functionality

# Hour 1-4: Standard monitoring
- [ ] Continue monitoring error rates
- [ ] User feedback channels open
- [ ] Performance within targets
- [ ] No security incidents

# Hour 4+: Normal operations
- [ ] Reduce monitoring intensity
- [ ] Document any issues encountered
- [ ] Celebrate successful launch 🎉
```

**Post-Launch:**
- Day 1: Close monitoring, team on standby
- Week 1: Daily review of metrics and feedback
- Week 2-4: Regular monitoring, address feedback
- Month 2+: Standard operations

---

## Scaling and Performance

### Horizontal Scaling

Vercel automatically handles horizontal scaling:

**Automatic Scaling:**
- Serverless functions scale automatically
- No configuration required
- Pay per execution
- Handle traffic spikes seamlessly

**Scaling Limits:**

| Plan | Concurrent Executions | Bandwidth | Build Minutes |
|------|----------------------|-----------|---------------|
| **Hobby** | 10 | 100 GB/month | 6,000/month |
| **Pro** | 100 | 1 TB/month | 24,000/month |
| **Enterprise** | Unlimited | Custom | Unlimited |

---

### Database Scaling

**Neon Autoscaling:**
- Automatic compute scaling
- Scale to zero for cost savings
- Instant provisioning of compute
- Read replicas for read-heavy workloads

**Scaling Strategy:**

**Vertical Scaling:**
1. Identify bottleneck (CPU, memory, connections)
2. Upgrade Neon compute tier
3. Monitor improvement

**Read Replicas:**
1. Create read replica in same region
2. Configure read-only queries to use replica
3. Monitor replication lag

**Connection Pooling:**
1. Use Neon pooled connection string
2. Configure pool size (default is usually optimal)
3. Monitor connection usage

---

### Cache Scaling

**Redis Scaling (Upstash):**
- Automatic scaling within plan limits
- Upgrade plan for more memory
- Multi-region replication (Enterprise)

**Caching Strategy Optimization:**
1. Increase TTL for stable data
2. Implement cache warming for hot data
3. Use cache hierarchies (L1: memory, L2: Redis)
4. Monitor hit/miss ratios
5. Optimize cache key structure

---

### CDN Optimization

**Vercel Edge Network:**
- Automatic CDN for static assets
- Global edge network (70+ regions)
- Intelligent routing
- Automatic asset optimization

**Optimization Tips:**
- Use Next.js Image for automatic optimization
- Enable ISR for semi-dynamic pages
- Configure appropriate cache headers
- Minimize bundle size
- Use dynamic imports for code splitting

---

## Backup and Disaster Recovery

### Backup Strategy

**Database Backups (Neon):**
- Frequency: Daily automated backups
- Retention: 30 days (configurable)
- Point-in-time recovery: Available
- Backup verification: Weekly restore test

**Backup Procedures:**

```bash
# Manual backup (if needed)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup-YYYYMMDD.sql

# Store encrypted backup securely
# Use S3, Google Cloud Storage, or similar
```

---

### Disaster Recovery

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 1 hour

**Disaster Recovery Scenarios:**

**Scenario 1: Database Corruption**
1. Assess extent of corruption
2. Isolate corrupted data
3. Restore from backup (point-in-time recovery)
4. Verify data integrity
5. Resume operations
6. Investigate root cause

**Scenario 2: Service Provider Outage**

*Vercel Outage:*
1. Check Vercel status page
2. If prolonged, consider deploying to alternative platform
3. Use DNS failover to backup deployment (if configured)
4. Communicate with users

*Database Outage:*
1. Check Neon status page
2. Wait for provider recovery (usually < 5 minutes)
3. Application automatically reconnects
4. Monitor for data consistency issues

*Redis Outage:*
1. Application continues with degraded performance (no caching)
2. Check Upstash status page
3. Monitor error rates
4. Avoid making cache-dependent operations critical path

**Scenario 3: Security Breach**
1. Follow incident response plan ([SECURITY.md](./SECURITY.md))
2. Isolate affected systems
3. Revoke compromised credentials
4. Restore from clean backup if needed
5. Patch vulnerability
6. Conduct forensic analysis
7. Notify affected users (GDPR requirement)

---

### Business Continuity

**Continuity Planning:**

1. **Documentation**
   - Maintain up-to-date runbooks
   - Document all procedures
   - Keep contact list current

2. **Training**
   - Train team on incident procedures
   - Regular disaster recovery drills
   - Knowledge sharing sessions

3. **Automation**
   - Automate backup and recovery
   - Automated failover where possible
   - Infrastructure as code

4. **Communication**
   - Status page for users
   - Internal communication channels
   - Escalation procedures

**Business Continuity Plan:**
- Maintain redundant systems
- Regular backup testing (monthly)
- Disaster recovery drills (quarterly)
- Update continuity plan (semi-annual)

---

## Multi-Region Deployment (Future)

**Multi-Region Strategy:**

For global scale or disaster recovery, consider multi-region deployment:

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│              Global Load Balancer                       │
│              (DNS-based routing)                        │
├──────────────────────┬──────────────────────────────────┤
│    Region 1 (US)     │      Region 2 (EU)              │
├──────────────────────┼──────────────────────────────────┤
│   Vercel Edge (US)   │     Vercel Edge (EU)            │
│   Database (US)      │     Database (EU)               │
│   Redis (US)         │     Redis (EU)                  │
│   Qdrant (US)        │     Qdrant (EU)                 │
└──────────────────────┴──────────────────────────────────┘
```

**Implementation Considerations:**
- Database replication (Neon supports this)
- Redis replication (Upstash multi-region)
- Qdrant multi-region setup
- Data residency requirements (GDPR)
- Increased complexity and cost
- Active-active or active-passive configuration

---

## Compliance Deployment Requirements

### GDPR Compliance Deployment

**Required Configurations:**
- [ ] Cookie consent banner implemented
- [ ] Privacy policy accessible at `/privacy`
- [ ] Terms of service accessible at `/terms`
- [ ] Data processing records maintained
- [ ] User rights tools functional (data export, deletion)
- [ ] Data residency requirements met (EU data stays in EU)

**GDPR Deployment Checklist:**
- [ ] Data Protection Officer (DPO) assigned
- [ ] DPIA completed for high-risk processing
- [ ] Data processing agreements with sub-processors signed
- [ ] Consent management system implemented
- [ ] Data breach notification procedures in place
- [ ] Records of processing activities maintained

---

### NEN 7510 Compliance Deployment

**Healthcare Security Requirements:**
- [ ] Encryption at rest enabled (AES-256)
- [ ] Encryption in transit enforced (TLS 1.3)
- [ ] Access control implemented (RBAC)
- [ ] Audit logging enabled (7-year retention)
- [ ] Incident response procedures documented
- [ ] Business continuity plan in place
- [ ] Security assessment completed
- [ ] Risk analysis documented

**Medical Data Handling:**
- Classify data sensitivity levels
- Implement appropriate protection measures
- Ensure proper consent management
- Enable audit trail for all access
- Implement data retention policies
- Support patient data export and deletion

---

### BIO Compliance Deployment

**Baseline Information Security (Dutch Government):**
- [ ] Security baseline documented
- [ ] Configuration hardening applied
- [ ] Access control with authentication and authorization
- [ ] Cryptographic protection (modern algorithms)
- [ ] Logging and monitoring enabled
- [ ] Incident management procedures
- [ ] Patch management process
- [ ] Security awareness and training

---

## Deployment Best Practices

### General Guidelines

1. **Test Before Deploy**
   - Test thoroughly in preview environment
   - Run automated tests in CI/CD
   - Manual testing for critical paths
   - Security testing before production

2. **Deploy Incrementally**
   - Deploy to preview first
   - Verify functionality
   - Deploy to production
   - Monitor closely

3. **Monitor Everything**
   - Application metrics
   - Error rates
   - Performance metrics
   - Security events
   - User feedback

4. **Plan for Rollback**
   - Always have rollback plan
   - Test rollback in staging
   - Keep previous version accessible
   - Document rollback procedures

5. **Communicate**
   - Notify team of deployments
   - Update users of new features
   - Communicate maintenance windows
   - Document changes

---

### Security Best Practices

**Production Security:**

1. **Secrets Management**
   - Use Vercel Environment Variables (encrypted at rest)
   - Never commit secrets to git
   - Rotate secrets quarterly
   - Audit secret access

2. **Access Control**
   - Limit production access to essential personnel
   - Use least privilege principle
   - Enable MFA for all production access
   - Audit access logs regularly

3. **Network Security**
   - Enable all security headers
   - Configure CSP appropriately
   - Restrict CORS to known origins
   - Enable rate limiting

4. **Monitoring**
   - Monitor authentication failures
   - Track authorization denials
   - Alert on suspicious activity
   - Review logs regularly

5. **Incident Response**
   - Have incident response plan ready
   - Test procedures regularly
   - Document all incidents
   - Learn and improve

---

### Performance Best Practices

**Optimization Guidelines:**

1. **Server Components**
   - Use Server Components by default
   - Minimize client JavaScript
   - Stream data with Suspense
   - Use cache components for data fetching

2. **Caching**
   - Enable intelligent caching
   - Use cache tags for invalidation
   - Implement stale-while-revalidate
   - Cache at multiple layers

3. **Database**
   - Use connection pooling (Neon pooled URL)
   - Add indexes for common queries
   - Use query optimization
   - Monitor slow queries

4. **Assets**
   - Use Next.js Image for optimization
   - Implement lazy loading
   - Use modern image formats (WebP, AVIF)
   - Minimize bundle size

5. **API**
   - Implement rate limiting
   - Use pagination for large datasets
   - Enable compression
   - Cache responses where appropriate

---

## Post-Deployment Operations

### Regular Maintenance Tasks

**Daily:**
- [ ] Review error logs for critical issues
- [ ] Monitor uptime (should be > 99.9%)
- [ ] Check cron job execution
- [ ] Review security alerts

**Weekly:**
- [ ] Review performance metrics
- [ ] Check for dependency updates (security)
- [ ] Review user feedback and issues
- [ ] Database query performance review
- [ ] Cache hit rate analysis

**Monthly:**
- [ ] Security audit of access logs
- [ ] Review and archive old data
- [ ] Dependency updates (non-security)
- [ ] Performance optimization review
- [ ] Cost analysis and optimization

**Quarterly:**
- [ ] Comprehensive security audit
- [ ] Disaster recovery drill
- [ ] Capacity planning review
- [ ] Configuration audit
- [ ] Compliance review (GDPR, NEN 7510)

**Yearly:**
- [ ] Penetration testing
- [ ] Third-party security audit
- [ ] Compliance certification renewal
- [ ] Architecture review
- [ ] Major dependency upgrades

---

### Update Procedures

**Security Updates:**

```bash
# 1. Check for security vulnerabilities
pnpm audit

# 2. Review vulnerabilities
pnpm audit --json > audit-report.json

# 3. Fix vulnerabilities
pnpm audit --fix

# 4. Test thoroughly
pnpm dev # Test locally
pnpm typecheck
pnpm lint

# 5. Create hotfix branch
git checkout -b hotfix/security-update
git add .
git commit -m "fix(security): update vulnerable dependencies"
git push origin hotfix/security-update

# 6. Fast-track review and merge
gh pr create --title "Security: Update Dependencies" --body "Fixes security vulnerabilities: [CVE-XXXX]"
gh pr merge --auto --squash

# 7. Verify production deployment
# Monitor for any breaking changes
```

**Feature Updates:**

```bash
# Follow standard development workflow
# No special process unless breaking changes involved

# For breaking changes:
# 1. Version bump (major version)
# 2. Migration guide for users
# 3. Backward compatibility period
# 4. Deprecation warnings before removal
```

---

## Support and Resources

### Deployment Support

**Internal Support:**
- DevOps Team: [devops@yourdomain.com](mailto:devops@yourdomain.com)
- Security Team: [security@yourdomain.com](mailto:security@yourdomain.com)
- On-Call Engineer: [See rotation schedule]

**External Support:**
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Neon Support: [neon.tech/docs/introduction/support](https://neon.tech/docs/introduction/support)
- GitHub Support: [support.github.com](https://support.github.com)

---

### Documentation Resources

**Internal Documentation:**
- [README.md](./README.md) - General overview and setup
- [CONFIGURATION.md](./CONFIGURATION.md) - Configuration guidelines
- [SECURITY.md](./SECURITY.md) - Security guidelines
- [Structure.md](./Structure.md) - Project structure

**External Documentation:**
- [Vercel Deployment](https://vercel.com/docs/deployments/overview)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Neon Documentation](https://neon.tech/docs/introduction)
- [Upstash Documentation](https://upstash.com/docs)
- [Qdrant Documentation](https://qdrant.tech/documentation/)

---

### Training Resources

**Team Training:**
- Deployment procedures training
- Incident response training
- Security awareness training
- Monitoring and alerting training

**Documentation:**
- Runbooks for common operations
- Incident response playbooks
- Troubleshooting guides
- Best practices documentation

---

## Deployment Change Log

Track all production deployments:

| Date | Version | Changes | Deployed By | Status |
|------|---------|---------|-------------|--------|
| 2026-02-24 | 1.0.0 | Initial production deployment with security compliance | DevOps | Success |
| - | - | - | - | - |

**Change Log Best Practices:**
- Document all production changes
- Include rollback information
- Track deployment success/failure
- Note any issues encountered
- Link to related tickets/PRs

---

## Deployment Metrics

### Key Performance Indicators (KPIs)

**Deployment Frequency:**
- Target: 2-3 deployments per week
- Measure: Average deployments per week
- Goal: Continuous delivery

**Deployment Success Rate:**
- Target: > 95% success rate
- Measure: Successful deployments / Total deployments
- Track: Reasons for failures

**Mean Time to Recovery (MTTR):**
- Target: < 30 minutes
- Measure: Time from incident detection to resolution
- Improve: Better monitoring, faster rollback

**Change Failure Rate:**
- Target: < 5%
- Measure: Failed deployments / Total deployments
- Reduce: Better testing, staged rollouts

**Lead Time for Changes:**
- Target: < 1 day (commit to production)
- Measure: Time from commit to production deployment
- Optimize: Automate more, reduce bottlenecks

---

## Conclusion

Following these deployment guidelines ensures:

✅ **Secure Deployment**
- All security measures implemented
- Compliance requirements met
- Regular security audits

✅ **Reliable Operations**
- Zero-downtime deployments
- Automatic scaling
- Quick rollback capability

✅ **Performance**
- Optimized for speed and efficiency
- Monitoring for continuous improvement
- Scaling strategy in place

✅ **Compliance**
- GDPR compliant
- NEN 7510 compliant
- BIO compliant
- Audit trails maintained

✅ **Maintainability**
- Clear documentation
- Automated processes
- Team training
- Regular reviews

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-24  
**Next Review:** 2026-05-24  
**Owner:** DevOps Team  
**Compliance:** SSD-4.1.05, NEN 7510, GDPR, BIO
