# Stripe Billing Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Stripe for recurring billing with three tiers (Pro, Business, Enterprise), a 14-day trial, two credit types, and usage-based metering via next-safe-action middleware.

**Architecture:** Better Auth Stripe plugin handles subscription lifecycle and webhook routing. Custom services (EntitlementService, UsageService, CreditService) handle usage tracking, credit management, and entitlement checks. Usage gating is enforced via next-safe-action middleware on every server action.

**Tech Stack:** Stripe SDK, @better-auth/stripe, Drizzle ORM, next-safe-action, neverthrow, React Email, Shadcn UI, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-23-stripe-billing-integration-design.md`

---

## File Structure

### New files

```
# Config
src/config/billing.ts                                    # Central tier config, credit costs, credit packs

# Schema (Drizzle tables)
src/server/db/schema/subscriptions.ts                    # Better Auth Stripe plugin subscriptions table
src/server/db/schema/usage-records.ts                    # Monthly usage tracking per org per resource
src/server/db/schema/credit-balances.ts                  # Purchased credit balances per org
src/server/db/schema/credit-transactions.ts              # Credit movement audit trail
src/server/db/schema/enterprise-limits.ts                # Custom limits for enterprise orgs

# Data access (query classes)
src/server/data-access/subscriptions.queries.ts          # Subscription lookups
src/server/data-access/usage-records.queries.ts          # Usage record CRUD + upsert
src/server/data-access/credit-balances.queries.ts        # Atomic credit deductions
src/server/data-access/credit-transactions.queries.ts    # Transaction logging
src/server/data-access/enterprise-limits.queries.ts      # Enterprise limit lookups

# DTOs
src/server/dto/billing.dto.ts                            # Billing-related DTOs

# Services
src/server/services/entitlement.service.ts               # "Can this org do X?" checks
src/server/services/usage.service.ts                     # Record usage, evaluate thresholds
src/server/services/credit.service.ts                    # Deduct/add credits atomically
src/server/services/billing-notification.service.ts      # Threshold warning emails

# Middleware
src/lib/server-action-client/subscription-middleware.ts  # Blocks expired/no-subscription orgs
src/lib/server-action-client/usage-middleware.ts         # Entitlement check + usage recording

# Validation
src/features/billing/validation/checkout.schema.ts       # Checkout session input validation
src/features/billing/validation/credit-purchase.schema.ts # Credit pack purchase validation

# Server actions
src/features/billing/actions/create-checkout-session.ts  # Subscription checkout via plugin
src/features/billing/actions/create-credit-purchase.ts   # Credit pack via Stripe SDK

# Cache
src/server/cache/billing-overview.cache.ts               # Cached billing overview data
src/server/cache/usage-data.cache.ts                     # Cached usage dashboard data

# Feature barrel
src/features/billing/queries/index.ts                    # Re-exports from cache layer

# Components
src/features/billing/components/billing-overview.tsx     # Main billing dashboard (RSC)
src/features/billing/components/usage-dashboard.tsx      # Credit/storage usage bars (RSC)
src/features/billing/components/plan-card.tsx             # Individual plan display (RSC)
src/features/billing/components/pricing-grid.tsx          # 3-tier plan comparison (RSC)
src/features/billing/components/credit-pack-card.tsx      # Purchasable credit pack (RSC)
src/features/billing/components/embedded-checkout.tsx     # 'use client' Stripe EmbeddedCheckout
src/features/billing/components/trial-banner.tsx          # Trial countdown banner (RSC)
src/features/billing/components/past-due-banner.tsx       # Payment failed warning (RSC)

# Hooks
src/features/billing/hooks/use-checkout.ts               # Manages embedded checkout flow

# Email templates
src/emails/templates/stripe-trial-ending.tsx             # Trial ending in 3 days
src/emails/templates/stripe-payment-failed.tsx           # Payment failed
src/emails/templates/stripe-credit-purchased.tsx         # Credit pack purchased
src/emails/templates/stripe-usage-warning.tsx            # 80%/90% threshold warning

# Routes
src/app/(main)/settings/billing/page.tsx                 # Billing overview / pricing page
src/app/(main)/settings/billing/checkout/page.tsx        # Embedded checkout for subscriptions
src/app/(main)/settings/billing/credits/page.tsx         # Embedded checkout for credit packs

# Cron
src/app/api/cron/reset-usage-periods/route.ts           # Daily cron: reset usage for annual plans
```

### Modified files

```
src/server/db/schema/auth.ts                             # Add stripeCustomerId to users + organizations
src/server/db/schema/index.ts                            # Export new schemas
src/lib/server-action-client/action-client.ts            # Add middleware, extend schemaMetadata
src/lib/auth.ts                                          # Add stripe plugin (before nextCookies)
src/lib/cache-utils.ts                                   # Add billing cache tags
src/lib/cache/tags-for.ts                                # Add billing entity to tagsFor
src/lib/cache/types.ts                                   # Add "billing" to CacheEntity union
src/server/services/rate-limiter.service.ts              # Expand UserTier
```

---

## Task 1: Billing Configuration

**Files:**

- Create: `src/config/billing.ts`

- [ ] **Step 1: Create the billing config file**

Create `src/config/billing.ts` with the `BillingPlan` interface, `BILLING_PLANS` const (pro, business, enterprise), `CREDIT_COSTS`, and `CREDIT_PACKS`. Use `as const satisfies Record<string, BillingPlan>` for type safety. All Stripe price IDs read from `process.env`. Export a `getPlanByName` helper and a `getTrialLimits` helper that applies the 0.35 multiplier.

Reference: Spec Section 1 for exact config shape.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No errors related to billing.ts

- [ ] **Step 3: Commit**

```bash
git add src/config/billing.ts
git commit -m "feat(billing): add central billing configuration"
```

---

## Task 2: Database Schema

**Files:**

- Modify: `src/server/db/schema/auth.ts` (add `stripeCustomerId` columns)
- Create: `src/server/db/schema/subscriptions.ts`
- Create: `src/server/db/schema/usage-records.ts`
- Create: `src/server/db/schema/credit-balances.ts`
- Create: `src/server/db/schema/credit-transactions.ts`
- Create: `src/server/db/schema/enterprise-limits.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Add stripeCustomerId to auth schema**

In `src/server/db/schema/auth.ts`:

- Add `stripeCustomerId: text("stripe_customer_id")` to the `users` table definition
- Add `stripeCustomerId: text("stripe_customer_id")` to the `organizations` table definition

Pattern: Follow existing column definitions in the same file.

- [ ] **Step 2: Create subscriptions schema**

Create `src/server/db/schema/subscriptions.ts` with the `subscriptions` table matching the Better Auth Stripe plugin expectations:

- `id` (text PK), `plan` (text, not null), `referenceId` (text, not null), `stripeCustomerId` (text), `stripeSubscriptionId` (text), `status` (text, not null — enum: active, canceled, incomplete, incomplete_expired, past_due, paused, trialing, unpaid), `periodStart` (timestamp), `periodEnd` (timestamp), `trialStart` (timestamp), `trialEnd` (timestamp), `cancelAtPeriodEnd` (boolean, default false), `cancelAt` (timestamp), `canceledAt` (timestamp), `endedAt` (timestamp), `seats` (integer), `billingInterval` (text), `stripeScheduleId` (text), `groupId` (text)

Export types: `Subscription`, `NewSubscription`.

- [ ] **Step 3: Create usage-records schema**

Create `src/server/db/schema/usage-records.ts`:

- Table: `usage_records`
- Columns: `id` (uuid PK), `organizationId` (text, not null), `resourceType` (text, not null — enum: ai_operations, recordings, meetings), `quantity` (integer, not null, default 0), `periodStart` (timestamp, not null), `periodEnd` (timestamp, not null), `createdAt`, `updatedAt`
- Unique constraint on `(organizationId, resourceType, periodStart)`

Export types: `UsageRecord`, `NewUsageRecord`.

- [ ] **Step 4: Create credit-balances schema**

Create `src/server/db/schema/credit-balances.ts`:

- Table: `credit_balances`
- Columns: `id` (uuid PK), `organizationId` (text, not null, unique), `meetingBalance` (numeric, not null, default '0'), `aiBalance` (numeric, not null, default '0'), `createdAt`, `updatedAt`

Export types: `CreditBalance`, `NewCreditBalance`.

- [ ] **Step 5: Create credit-transactions schema**

Create `src/server/db/schema/credit-transactions.ts`:

- Table: `credit_transactions`
- Columns: `id` (uuid PK), `organizationId` (text, not null), `creditType` (text, not null — enum: meeting, ai), `amount` (numeric, not null), `type` (text, not null — enum: purchase, deduction, refund, reset), `description` (text, not null), `stripePaymentIntentId` (text), `createdAt`

Export types: `CreditTransaction`, `NewCreditTransaction`.

- [ ] **Step 6: Create enterprise-limits schema**

Create `src/server/db/schema/enterprise-limits.ts`:

- Table: `enterprise_limits`
- Columns: `id` (uuid PK), `organizationId` (text, not null, unique), `meetingCredits` (integer, not null), `aiCredits` (integer, not null), `storageGb` (integer, not null), `seats` (integer, not null), `graceBufferPercent` (integer, not null, default 5), `createdAt`, `updatedAt`

Export types: `EnterpriseLimit`, `NewEnterpriseLimit`.

- [ ] **Step 7: Update schema index**

Add exports to `src/server/db/schema/index.ts`:

```typescript
export * from "./subscriptions";
export * from "./usage-records";
export * from "./credit-balances";
export * from "./credit-transactions";
export * from "./enterprise-limits";
```

- [ ] **Step 8: Verify TypeScript compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`
Expected: No schema-related errors.

- [ ] **Step 9: Generate migration**

Run: `pnpm db:generate --name add-stripe-billing-schema`
Verify: Migration file appears in `src/server/db/migrations/`.

- [ ] **Step 10: Commit**

```bash
git add src/server/db/schema/ src/server/db/migrations/
git commit -m "feat(billing): add billing database schema and migration"
```

---

## Task 3: DTOs

**Files:**

- Create: `src/server/dto/billing.dto.ts`

- [ ] **Step 1: Create billing DTOs**

Create `src/server/dto/billing.dto.ts` with interfaces:

- `EntitlementResult` — `{ allowed: boolean; remaining: number; limit: number; usagePercent: number; warning?: string; creditType: 'meeting' | 'ai' }`
- `UsageSummaryDto` — per-resource usage for dashboard
- `BillingOverviewDto` — plan info, subscription status, trial info, usage summary, credit balances
- `CreditBalanceDto` — meeting and AI balances

Pattern: Follow `src/server/dto/organization-settings.dto.ts`.

- [ ] **Step 2: Commit**

```bash
git add src/server/dto/billing.dto.ts
git commit -m "feat(billing): add billing DTOs"
```

---

## Task 4: Data Access Layer

**Files:**

- Create: `src/server/data-access/subscriptions.queries.ts`
- Create: `src/server/data-access/usage-records.queries.ts`
- Create: `src/server/data-access/credit-balances.queries.ts`
- Create: `src/server/data-access/credit-transactions.queries.ts`
- Create: `src/server/data-access/enterprise-limits.queries.ts`

- [ ] **Step 1: Create subscriptions queries**

Create `src/server/data-access/subscriptions.queries.ts` as a static class `SubscriptionsQueries`:

- `findActiveByOrgId(orgId)` — returns first subscription where `referenceId = orgId` and status in ('active', 'trialing', 'past_due', 'canceled')
- `findByStripeSubscriptionId(stripeSubId)` — lookup by Stripe ID

Pattern: Follow `PrivacyRequestsQueries` static class pattern with Drizzle `db.select().from()`.

- [ ] **Step 2: Create usage-records queries**

Create `src/server/data-access/usage-records.queries.ts` as `UsageRecordsQueries`:

- `findCurrentPeriod(orgId, resourceType)` — finds record where `periodStart <= now < periodEnd`
- `upsertUsage(orgId, resourceType, quantity, periodStart, periodEnd)` — creates or increments usage record using `ON CONFLICT` upsert
- `getUsageSummary(orgId, periodStart, periodEnd)` — returns all resource type records for the org in a period
- `resetForNewPeriod(orgId, periodStart, periodEnd)` — creates zeroed usage records for all resource types

The upsert must use Drizzle's `onConflictDoUpdate` to atomically increment `quantity`.

- [ ] **Step 3: Create credit-balances queries**

Create `src/server/data-access/credit-balances.queries.ts` as `CreditBalancesQueries`:

- `findByOrgId(orgId)` — returns credit balance or null
- `ensureExists(orgId)` — creates with zero balances if not exists, returns balance
- `deductMeetingCredits(orgId, amount)` — atomic conditional UPDATE: `SET meeting_balance = meeting_balance - amount WHERE meeting_balance >= amount`. Returns number of rows updated (0 = insufficient).
- `deductAiCredits(orgId, amount)` — same for AI credits
- `addMeetingCredits(orgId, amount)` — increments meeting balance
- `addAiCredits(orgId, amount)` — increments AI balance

**Critical:** Deduction methods use raw SQL `WHERE balance >= amount` for atomic concurrency protection.

- [ ] **Step 4: Create credit-transactions queries**

Create `src/server/data-access/credit-transactions.queries.ts` as `CreditTransactionsQueries`:

- `insert(data: NewCreditTransaction)` — log a transaction
- `findByOrgId(orgId, limit?)` — recent transactions for an org

- [ ] **Step 5: Create enterprise-limits queries**

Create `src/server/data-access/enterprise-limits.queries.ts` as `EnterpriseLimitsQueries`:

- `findByOrgId(orgId)` — returns custom limits or null
- `createOrUpdate(data)` — upsert enterprise limits

- [ ] **Step 6: Verify compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add src/server/data-access/
git commit -m "feat(billing): add billing data access layer"
```

---

## Task 5: Services — EntitlementService

**Files:**

- Create: `src/server/services/entitlement.service.ts`

- [ ] **Step 1: Implement EntitlementService**

Create `src/server/services/entitlement.service.ts` as a static class:

`checkEntitlement(orgId, resourceType)` → `Promise<ActionResult<EntitlementResult>>`:

1. Get org's active subscription via `SubscriptionsQueries.findActiveByOrgId(orgId)`
2. If no subscription → return `err(ActionErrors.forbidden("No active subscription"))`
3. Determine plan name from subscription record
4. Get limits: if enterprise → `EnterpriseLimitsQueries.findByOrgId(orgId)`, else → `BILLING_PLANS[plan]`
5. If `trialing` → apply `creditMultiplier` / `limitMultiplier` (0.35)
6. Get current usage via `UsageRecordsQueries.findCurrentPeriod(orgId, resourceType)`
7. Map resourceType to credit type: `recordings`/`meetings` → `meeting`, `ai_operations` → `ai`
8. Calculate: included credits (from config), current usage, grace buffer (5%)
9. If usage < included → allowed, return remaining
10. If usage < included + grace → allowed, return warning
11. If past grace → check `CreditBalancesQueries.findByOrgId(orgId)` for purchased credits
12. If purchased credits available → allowed (caller must deduct)
13. Else → not allowed

`getSubscriptionStatus(orgId)` → `Promise<ActionResult<{ status, plan, trialEnd?, cancelAt? }>>`:

- Returns org's subscription state for UI display

Pattern: Follow `OrganizationSettingsService` with `ok()`/`err()` from neverthrow, `ActionErrors` for errors.

- [ ] **Step 2: Verify compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/entitlement.service.ts
git commit -m "feat(billing): add entitlement service"
```

---

## Task 6: Services — UsageService & CreditService

**Files:**

- Create: `src/server/services/usage.service.ts`
- Create: `src/server/services/credit.service.ts`

- [ ] **Step 1: Implement UsageService**

Create `src/server/services/usage.service.ts` as a static class:

`recordUsage(orgId, resourceType, quantity)` → `Promise<ActionResult<EntitlementResult>>`:

1. Get active subscription to determine current billing period
2. Upsert usage via `UsageRecordsQueries.upsertUsage()`
3. Call `EntitlementService.checkEntitlement()` to evaluate thresholds
4. If threshold crossed (80% or 90%) → fire-and-forget `BillingNotificationService.sendUsageWarning()`
5. Return entitlement result

`getUsageSummary(orgId)` → `Promise<ActionResult<UsageSummaryDto[]>>`:

- Returns all resource usage for current period

- [ ] **Step 2: Implement CreditService**

Create `src/server/services/credit.service.ts` as a static class:

`deductCredits(orgId, creditType, amount)` → `Promise<ActionResult<{ newBalance: number }>>`:

1. Call atomic deduction: `CreditBalancesQueries.deductMeetingCredits()` or `deductAiCredits()`
2. If 0 rows updated → return `err(ActionErrors.forbidden("Insufficient credits"))`
3. Log transaction via `CreditTransactionsQueries.insert()` with type `deduction`
4. Return new balance

`addCredits(orgId, creditType, amount, stripePaymentIntentId?)` → `Promise<ActionResult<{ newBalance: number }>>`:

1. Ensure balance exists via `CreditBalancesQueries.ensureExists()`
2. Add credits via `CreditBalancesQueries.addMeetingCredits()` or `addAiCredits()`
3. Log transaction with type `purchase`
4. Return new balance

`getBalance(orgId)` → `Promise<ActionResult<CreditBalanceDto>>`:

- Returns current meeting and AI balances

- [ ] **Step 3: Verify compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/server/services/usage.service.ts src/server/services/credit.service.ts
git commit -m "feat(billing): add usage and credit services"
```

---

## Task 7: Email Templates

> **Moved before BillingNotificationService** — the notification service imports these templates, so they must exist first.

**Files:**

- Create: `src/emails/templates/stripe-trial-ending.tsx`
- Create: `src/emails/templates/stripe-payment-failed.tsx`
- Create: `src/emails/templates/stripe-credit-purchased.tsx`
- Create: `src/emails/templates/stripe-usage-warning.tsx`

- [ ] **Step 1: Create trial ending template**

Create `stripe-trial-ending.tsx`:

- Props: `userName`, `planName`, `trialEndDate`, `billingUrl`
- Message: "Your trial ends in 3 days. Subscribe to keep access."
- CTA button: "Choose a Plan" → billingUrl

Pattern: Follow `stripe-trial-started.tsx` structure exactly (same imports, BaseTemplate wrapper, Button component).

- [ ] **Step 2: Create payment failed template**

Create `stripe-payment-failed.tsx`:

- Props: `userName`, `planName`, `billingUrl`
- Message: "We couldn't process your payment. Update your payment method."
- CTA button: "Update Payment" → billingUrl

- [ ] **Step 3: Create credit purchased template**

Create `stripe-credit-purchased.tsx`:

- Props: `userName`, `creditType`, `amount`, `newBalance`
- Message: "You purchased X credits. New balance: Y."

- [ ] **Step 4: Create usage warning template**

Create `stripe-usage-warning.tsx`:

- Props: `userName`, `resourceType`, `usagePercent`, `threshold`, `billingUrl`
- Message: "You've used X% of your monthly Y allowance."
- CTA button: "Buy Credits" → billingUrl

- [ ] **Step 5: Commit**

```bash
git add src/emails/templates/stripe-trial-ending.tsx src/emails/templates/stripe-payment-failed.tsx src/emails/templates/stripe-credit-purchased.tsx src/emails/templates/stripe-usage-warning.tsx
git commit -m "feat(billing): add billing email templates"
```

---

## Task 8: Services — BillingNotificationService

**Files:**

- Create: `src/server/services/billing-notification.service.ts`

- [ ] **Step 1: Implement BillingNotificationService**

Create `src/server/services/billing-notification.service.ts` as a static class:

Methods for **new** templates (all fire-and-forget, return `Promise<void>`):

- `sendUsageWarning(orgId, resourceType, usagePercent, threshold)` — sends email using `stripe-usage-warning.tsx`
- `sendTrialEnding(orgId, trialEndDate)` — sends email using `stripe-trial-ending.tsx`
- `sendPaymentFailed(orgId)` — sends email using `stripe-payment-failed.tsx`
- `sendCreditPurchased(orgId, creditType, amount)` — sends email using `stripe-credit-purchased.tsx`

Methods for **existing** templates (used by auth plugin lifecycle hooks):

- `sendTrialStarted(orgId, planName, trialEndDate)` — sends email using `stripe-trial-started.tsx` (existing)
- `sendTrialExpired(orgId)` — sends email using `stripe-expired.tsx` (existing)
- `sendSubscriptionActive(orgId, planName)` — sends email using `stripe-paid-started.tsx` (existing)
- `sendSubscriptionCanceled(orgId)` — sends email using `stripe-cancelled.tsx` (existing)

Each method:

1. Looks up org owner email via `OrganizationQueries`
2. Calls `sendEmailFromTemplate()` (existing email utility)
3. Catches errors silently with `logger.error()`

Pattern: Follow existing email sending in `auth.ts` invitation hooks.

- [ ] **Step 2: Commit**

```bash
git add src/server/services/billing-notification.service.ts
git commit -m "feat(billing): add billing notification service"
```

---

## Task 9: Middleware — Subscription & Usage

**Files:**

- Create: `src/lib/server-action-client/subscription-middleware.ts`
- Create: `src/lib/server-action-client/usage-middleware.ts`
- Modify: `src/lib/server-action-client/action-client.ts`

- [ ] **Step 1: Create subscription middleware**

Create `src/lib/server-action-client/subscription-middleware.ts`:

Export `subscriptionMiddleware` function matching the existing middleware signature (`{ next, ctx, metadata }`):

1. If `metadata.skipSubscriptionCheck === true` → call `next({ ctx })`
2. Get org's subscription via `SubscriptionsQueries.findActiveByOrgId(ctx.organizationId)`
3. If status is `trialing`, `active`, `canceled` (within period) → call `next({ ctx: { ...ctx, subscription } })`
4. If `past_due` → call `next({ ctx: { ...ctx, subscription, subscriptionWarning: "payment_past_due" } })`
5. If no subscription or expired → throw `ActionErrors.forbidden("No active subscription. Please subscribe to continue.")`

Pattern: Follow `audit-middleware.ts` function signature exactly.

- [ ] **Step 2: Create usage middleware**

Create `src/lib/server-action-client/usage-middleware.ts`:

Export `usageMiddleware` function:

1. If `metadata.usage` is undefined → call `next({ ctx })` (not a metered action)
2. Call `EntitlementService.checkEntitlement(ctx.organizationId, metadata.usage.resourceType)`
3. If not allowed → throw `ActionErrors.forbidden()`
4. Call `next({ ctx: { ...ctx, entitlement } })`
5. After `next` returns successfully → call `UsageService.recordUsage()` to track consumption
6. If entitlement says credits needed (past grace) → call `CreditService.deductCredits()` after usage recorded

- [ ] **Step 3: Update action client**

Modify `src/lib/server-action-client/action-client.ts`:

1. Extend `schemaMetadata` with:

```typescript
usage: z.object({
  resourceType: z.enum(["ai_operations", "recordings", "meetings"]),
  quantity: z.number(),
}).optional(),
skipSubscriptionCheck: z.boolean().optional(),
```

2. Reorder middleware chain:

```typescript
export const authorizedActionClient = createSafeActionClient({...})
  .use(actionLoggerMiddleware)
  .use(authenticationMiddleware)
  .use(auditLoggingMiddleware)           // MOVED UP
  .use(subscriptionMiddleware)           // NEW
  .use(usageMiddleware)                  // NEW
  .use(cacheInvalidationMiddleware);
```

3. Update `ActionContext` interface to include `subscription?` and `entitlement?` fields.

- [ ] **Step 4: Verify compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`
Expected: No errors. All existing actions still compile since new metadata fields are optional.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server-action-client/
git commit -m "feat(billing): add subscription and usage middleware to action client"
```

---

## Task 10: Better Auth Stripe Plugin Integration

**Files:**

- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add stripe plugin to auth config**

In `src/lib/auth.ts`:

1. Import the stripe plugin: `import { stripe } from "@better-auth/stripe"`
2. Import Stripe SDK: `import Stripe from "stripe"`
3. Create Stripe client instance: `const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!)`
4. Import `BILLING_PLANS` from `@/config/billing`
5. Add the `stripe()` plugin to the `plugins` array **before** `nextCookies()`:

```typescript
stripe({
  stripeClient,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  organization: { enabled: true },
  subscription: {
    enabled: true,
    plans: [
      {
        name: "pro",
        priceId: BILLING_PLANS.pro.stripePriceId,
        annualDiscountPriceId: BILLING_PLANS.pro.stripeAnnualPriceId,
        limits: BILLING_PLANS.pro.limits,
        freeTrial: {
          days: 14,
          onTrialStart: async (subscription) => {
            // Send trial started email via BillingNotificationService
          },
          onTrialEnd: async (data) => {
            // Send welcome to Pro email
          },
          onTrialExpired: async (subscription) => {
            // Send trial expired email
          },
        },
      },
      {
        name: "business",
        priceId: BILLING_PLANS.business.stripePriceId,
        annualDiscountPriceId: BILLING_PLANS.business.stripeAnnualPriceId,
        seatPriceId: BILLING_PLANS.business.seatPriceId,
        limits: BILLING_PLANS.business.limits,
      },
    ],
    authorizeReference: async ({ referenceId, user }) => {
      // Verify user is org owner/admin
    },
    getCheckoutSessionParams: async () => ({
      params: {
        ui_mode: "embedded" as const,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      },
    }),
    onSubscriptionComplete: async (data) => {
      // Initialize usage_records for the billing period
      // Ensure credit_balances row exists
    },
    onSubscriptionUpdate: async (data) => {
      // Handle plan changes
    },
    onSubscriptionCancel: async (data) => {
      // Send cancellation email
    },
  },
  onEvent: async (event) => {
    // Handle: invoice.paid, invoice.payment_failed,
    // customer.subscription.trial_will_end, payment_intent.succeeded
  },
}),
```

6. Add `subscriptions` table to the database adapter schema mapping.

- [ ] **Step 2: Verify compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(billing): integrate Better Auth Stripe plugin"
```

---

## Task 11: Cache Layer

**Files:**

- Create: `src/server/cache/billing-overview.cache.ts`
- Create: `src/server/cache/usage-data.cache.ts`
- Create: `src/features/billing/queries/index.ts`
- Modify: `src/lib/cache-utils.ts`
- Modify: `src/lib/cache/tags-for.ts`

- [ ] **Step 1: Add billing cache tags**

In `src/lib/cache-utils.ts`, add to the `CacheTags` object:

```typescript
billingOverview: (orgId: string) => `billing-overview:${orgId}`,
billingUsage: (orgId: string) => `billing-usage:${orgId}`,
```

In `src/lib/cache/types.ts`, add `"billing"` to the `CacheEntity` union type.

In `src/lib/cache/tags-for.ts`, add a `"billing"` case to the switch that produces tags from `CacheTags.billingOverview(orgId)` and `CacheTags.billingUsage(orgId)`.

- [ ] **Step 2: Create billing cache functions**

Create `src/server/cache/billing-overview.cache.ts`:

```typescript
export async function getCachedBillingOverview(
  orgId: string,
): Promise<BillingOverviewDto> {
  "use cache";
  cacheTag(...tagsFor("billing", { organizationId: orgId }));
  // Call EntitlementService.getSubscriptionStatus() + UsageService.getUsageSummary() + CreditService.getBalance()
}
```

Create `src/server/cache/usage-data.cache.ts`:

```typescript
export async function getCachedUsageData(
  orgId: string,
): Promise<UsageSummaryDto[]> {
  "use cache";
  cacheTag(...tagsFor("billing", { organizationId: orgId }));
  // Call UsageService.getUsageSummary()
}
```

Pattern: Follow `src/server/cache/chat.cache.ts` exactly.

- [ ] **Step 3: Create feature barrel export**

Create `src/features/billing/queries/index.ts`:

```typescript
export { getCachedBillingOverview } from "@/server/cache/billing-overview.cache";
export { getCachedUsageData } from "@/server/cache/usage-data.cache";
```

- [ ] **Step 4: Commit**

```bash
git add src/server/cache/ src/features/billing/queries/ src/lib/cache-utils.ts src/lib/cache/tags-for.ts
git commit -m "feat(billing): add billing cache layer"
```

---

## Task 12: Validation Schemas

**Files:**

- Create: `src/features/billing/validation/checkout.schema.ts`
- Create: `src/features/billing/validation/credit-purchase.schema.ts`

- [ ] **Step 1: Create validation schemas**

`checkout.schema.ts`:

```typescript
export const createCheckoutSessionSchema = z.object({
  plan: z.enum(["pro", "business"]),
  annual: z.boolean().optional().default(false),
  seats: z.number().int().positive().optional(),
});
```

`credit-purchase.schema.ts`:

```typescript
export const createCreditPurchaseSchema = z.object({
  creditType: z.enum(["meeting", "ai"]),
  packIndex: z.number().int().min(0),
});
```

Pattern: Follow `src/features/settings/validation/profile.schema.ts`.

- [ ] **Step 2: Commit**

```bash
git add src/features/billing/validation/
git commit -m "feat(billing): add billing validation schemas"
```

---

## Task 13: Server Actions

**Files:**

- Create: `src/features/billing/actions/create-checkout-session.ts`
- Create: `src/features/billing/actions/create-credit-purchase.ts`

- [ ] **Step 1: Create checkout session action**

Create `src/features/billing/actions/create-checkout-session.ts`:

Uses `authorizedActionClient` with `skipSubscriptionCheck: true` (billing actions must work without active subscription):

1. Validates input with `createCheckoutSessionSchema`
2. Calls `auth.api.subscription.upgrade()` (Better Auth plugin) with `disableRedirect: true` to get the Checkout Session
3. Returns the session's `client_secret` for embedded checkout

Pattern: Follow `src/features/settings/actions/organization-instructions.ts`.

- [ ] **Step 2: Create credit purchase action**

Create `src/features/billing/actions/create-credit-purchase.ts`:

Uses `authorizedActionClient` with `skipSubscriptionCheck: true`:

1. Validates input with `createCreditPurchaseSchema`
2. Looks up the `CREDIT_PACKS[creditType][packIndex]` to get the Stripe price ID
3. Creates a Stripe Checkout Session directly via Stripe SDK with `mode: 'payment'`, `ui_mode: 'embedded'`, and metadata `{ organizationId, creditType, credits }`
4. Returns the session's `client_secret`

- [ ] **Step 3: Verify compilation**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/features/billing/actions/
git commit -m "feat(billing): add checkout and credit purchase server actions"
```

---

## Task 14: Install Stripe Frontend Dependencies

- [ ] **Step 1: Install Stripe frontend packages**

Run: `pnpm add @stripe/react-stripe-js @stripe/stripe-js --filter=web`

These are required for the `<EmbeddedCheckout>` component and `loadStripe()` initialization.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml apps/web/package.json
git commit -m "feat(billing): add Stripe frontend dependencies"
```

---

## Task 15: Billing UI Components

**Files:**

- Create: all 8 component files in `src/features/billing/components/`
- Create: `src/features/billing/hooks/use-checkout.ts`

- [ ] **Step 1: Create plan-card component**

Create `src/features/billing/components/plan-card.tsx` (RSC):

- Props: `plan`, `isCurrentPlan`, `isTrialing`, `onSelect`
- Displays plan name, price, features list, included credits, storage limit
- Shows "Current Plan" badge or "Select" button
- Enterprise shows "Contact Sales" instead

- [ ] **Step 2: Create pricing-grid component**

Create `src/features/billing/components/pricing-grid.tsx` (RSC):

- Renders 3 `PlanCard` components side by side (Pro, Business, Enterprise)
- Responsive: stacks on mobile

- [ ] **Step 3: Create usage-dashboard component**

Create `src/features/billing/components/usage-dashboard.tsx` (RSC):

- Props: `usageData`, `plan`, `isTrialing`
- Shows progress bars for meeting credits, AI credits, storage
- Color coding: green (<80%), yellow (80-90%), red (>90%)
- Shows "X/Y used" text with remaining count

- [ ] **Step 4: Create credit-pack-card component**

Create `src/features/billing/components/credit-pack-card.tsx` (RSC):

- Props: `creditType`, `credits`, `onPurchase`
- Displays credit amount and purchase button

- [ ] **Step 5: Create billing-overview component**

Create `src/features/billing/components/billing-overview.tsx` (RSC):

- Fetches data via `getCachedBillingOverview()`
- Composes: subscription info, usage-dashboard, credit balances, credit pack cards
- Conditionally shows pricing-grid if no active subscription

- [ ] **Step 6: Create trial-banner component**

Create `src/features/billing/components/trial-banner.tsx` (RSC):

- Props: `trialEndDate`
- Shows countdown: "X days left in your trial"
- CTA: "Subscribe now"

- [ ] **Step 7: Create past-due-banner component**

Create `src/features/billing/components/past-due-banner.tsx` (RSC):

- Warning banner: "Payment failed. Update your payment method."
- CTA: "Update Payment" → Stripe billing portal

- [ ] **Step 8: Create embedded-checkout component**

Create `src/features/billing/components/embedded-checkout.tsx` ('use client'):

- Initialize Stripe with `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)` at module scope (singleton)
- Uses `@stripe/react-stripe-js` `EmbeddedCheckoutProvider` and `EmbeddedCheckout`
- Props: `clientSecret`
- Wraps in error boundary and Suspense with loading skeleton

- [ ] **Step 9: Create use-checkout hook**

Create `src/features/billing/hooks/use-checkout.ts` ('use client'):

- Calls `createCheckoutSessionAction` or `createCreditPurchaseAction`
- Manages `clientSecret` state
- Returns `{ startCheckout, clientSecret, isLoading }`

Pattern: Follow `src/features/settings/hooks/use-privacy-requests.ts` with `useAction`.

- [ ] **Step 10: Commit**

```bash
git add src/features/billing/components/ src/features/billing/hooks/
git commit -m "feat(billing): add billing UI components and hooks"
```

---

## Task 16: Billing Pages

**Files:**

- Create: `src/app/(main)/settings/billing/page.tsx`
- Create: `src/app/(main)/settings/billing/checkout/page.tsx`
- Create: `src/app/(main)/settings/billing/credits/page.tsx`

- [ ] **Step 1: Create main billing page**

Create `src/app/(main)/settings/billing/page.tsx`:

- RSC page that fetches billing overview via cache
- If no subscription → renders `PricingGrid`
- If trialing → renders `TrialBanner` + `BillingOverview`
- If active → renders `BillingOverview`
- If past_due → renders `PastDueBanner` + `BillingOverview`
- Wrap data-dependent sections in Suspense

Pattern: Follow `src/app/(main)/settings/organization/page.tsx`.

- [ ] **Step 2: Create checkout page**

Create `src/app/(main)/settings/billing/checkout/page.tsx`:

- Receives `searchParams.plan` and `searchParams.annual`
- Renders `EmbeddedCheckout` component
- On success → redirects back to billing page

- [ ] **Step 3: Create credits page**

Create `src/app/(main)/settings/billing/credits/page.tsx`:

- Receives `searchParams.type` (meeting/ai) and `searchParams.pack`
- Renders `EmbeddedCheckout` for credit pack purchase

- [ ] **Step 4: Verify page renders**

Run: `pnpm dev:web` and navigate to `/settings/billing`
Expected: Page renders without errors (may show empty state if no Stripe keys configured).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main\)/settings/billing/
git commit -m "feat(billing): add billing pages"
```

---

## Task 17: Page-Level Subscription Gating

**Files:**

- Modify: `src/app/(main)/layout.tsx` (or the relevant settings layout)

- [ ] **Step 1: Add subscription check to main layout**

In the `(main)` layout, after auth check:

1. Fetch subscription status via `SubscriptionsQueries.findActiveByOrgId(orgId)`
2. If no valid subscription (expired, no subscription) AND the current route is NOT `/settings/billing`, `/settings/billing/*`, onboarding, or auth pages → redirect to `/settings/billing?expired=true`
3. The billing page itself must always remain accessible so users can subscribe

This implements the spec's "page-level gating" requirement from Section 6.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(main\)/
git commit -m "feat(billing): add page-level subscription gating in layout"
```

---

## Task 18: Downgrade Protection & Seat Management

**Files:**

- Create: `src/features/billing/actions/validate-downgrade.ts`

- [ ] **Step 1: Create downgrade validation action**

Create `src/features/billing/actions/validate-downgrade.ts`:

Uses `authorizedActionClient` with `skipSubscriptionCheck: true`:

1. Accepts target plan name
2. Checks current storage usage against target plan's `storageGb` limit
3. If storage exceeds target limit → return error: "Reduce storage to X GB before downgrading"
4. If OK → return success

This action is called by the UI before initiating a downgrade checkout.

- [ ] **Step 2: Verify the plugin's seat sync works**

The Better Auth Stripe plugin's `afterMemberChange` hook automatically syncs the organization's member count to Stripe for per-seat billing (`seatPriceId`). Verify in Task 10 that `seatPriceId` is passed in the business plan config. No additional code needed — the plugin handles seat changes automatically via prorated billing.

Document: adding a member to a Business org → plugin detects member count change → updates Stripe subscription quantity → Stripe prorates the charge.

- [ ] **Step 3: Commit**

```bash
git add src/features/billing/actions/validate-downgrade.ts
git commit -m "feat(billing): add downgrade validation"
```

---

## Task 19: Cron Job — Usage Period Reset

**Files:**

- Create: `src/app/api/cron/reset-usage-periods/route.ts`

- [ ] **Step 1: Create cron route handler**

Create `src/app/api/cron/reset-usage-periods/route.ts`:

```typescript
export async function GET(request: Request) {
  // Verify cron secret header
  // Find all usage records where periodEnd < now()
  // For each expired period: create new usage records with zeroed counters for the next monthly period
  // Return summary of reset orgs
}
```

This handles annual plan credit resets (monthly subscriptions are reset via `invoice.paid` webhook).

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/reset-usage-periods/
git commit -m "feat(billing): add usage period reset cron job"
```

---

## Task 20: Rate Limiter Update

**Files:**

- Modify: `src/server/services/rate-limiter.service.ts`

- [ ] **Step 1: Expand UserTier**

In `src/server/services/rate-limiter.service.ts`:

1. Change `UserTier` from `"free" | "pro"` to `"free" | "pro" | "business" | "enterprise" | "trialing"`
2. Add tier limits for `business`, `enterprise`, and `trialing`
3. Update `getUserTier()` to read from `SubscriptionsQueries` instead of Redis

- [ ] **Step 2: Commit**

```bash
git add src/server/services/rate-limiter.service.ts
git commit -m "feat(billing): expand rate limiter to support billing tiers"
```

---

## Task 21: Integration Testing & Lint

- [ ] **Step 1: Run type checking**

Run: `pnpm tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors.

- [ ] **Step 2: Run linting**

Run: `pnpm lint --filter=web`
Expected: No errors related to billing files.

- [ ] **Step 3: Run build**

Run: `pnpm build --filter=web`
Expected: Successful build.

- [ ] **Step 4: Fix any issues found**

Address all type errors, lint errors, and build errors.

- [ ] **Step 5: Final commit**

Stage only billing-related files (avoid staging sensitive files):

```bash
git add src/config/ src/server/ src/lib/ src/features/billing/ src/emails/templates/stripe-* src/app/\(main\)/settings/billing/ src/app/api/cron/reset-usage-periods/
git commit -m "fix(billing): resolve lint and type errors"
```
