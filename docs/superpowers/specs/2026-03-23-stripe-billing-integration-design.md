# Stripe Billing Integration Design

## Overview

Integrate Stripe for recurring billing with three tiers (Pro, Business, Enterprise), a 14-day trial at reduced capacity, usage-based metering with two credit types, and prepaid overage packs. Built on top of Better Auth's Stripe plugin (`@better-auth/stripe`).

## Requirements

- **Three tiers**: Pro (individual), Business (team with seats), Enterprise (sales-led)
- **14-day trial**: Full Pro features at 35% of Pro's included credits and limits
- **Two credit types**: Meeting credits (recordings + meetings) and AI credits (AI operations)
- **Monthly included credits**: Reset each billing cycle, no rollover
- **Purchasable credit packs**: One-time prepaid, never expire, roll over indefinitely
- **Usage gating**: Warn at 80%/90%, 5% grace buffer, hard block after, credits consumed for overages
- **Billing scope**: Per organization (Pro = individual org, Business = team org, Enterprise = custom)
- **Embedded checkout**: Stripe Checkout embedded in-app via `<EmbeddedCheckout>`
- **Upgrades immediate, downgrades end-of-cycle**: With proration
- **Enterprise**: Sales-led, no self-serve, custom limits per org

## Architecture Decision

**Approach A: Better Auth Stripe Plugin-First** — the plugin handles Stripe customer creation, subscription lifecycle, and webhook routing tied to the auth system. Custom services handle usage tracking, credits, entitlements, and tier configuration on top.

Rationale: The plugin is already installed, the entire auth system is built on Better Auth, and it handles the tedious Stripe-auth glue (customer mapping, session enrichment, webhook routing). Custom billing logic (credits, usage, entitlements) sits cleanly on top. If the plugin proves limiting for specific features (credit pack purchases), those use the Stripe SDK directly.

---

## Section 1: Tier Configuration & Limits

Central, type-safe config in `src/config/billing.ts`:

```typescript
interface BillingPlan {
  name: string;
  stripePriceId?: string;
  stripeAnnualPriceId?: string;
  seatPriceId?: string;
  salesLed?: boolean;
  seats: number | null;
  trial: {
    days: number;
    creditMultiplier: number;
    limitMultiplier: number;
  } | null;
  limits: { storageGb: number } | null;
  includedCredits: { meeting: number; ai: number } | null;
  graceBufferPercent: number;
  warningThresholds: number[];
}

const BILLING_PLANS = {
  pro: {
    name: "Pro",
    stripePriceId: env.STRIPE_PRO_PRICE_ID,
    stripeAnnualPriceId: env.STRIPE_PRO_ANNUAL_PRICE_ID,
    seats: 1,
    trial: {
      days: 14,
      creditMultiplier: 0.35, // 35% of Pro included credits
      limitMultiplier: 0.35, // 35% of Pro limits
    },
    limits: {
      storageGb: 10,
    },
    includedCredits: {
      meeting: 50, // covers both recordings + meetings
      ai: 500,
    },
    graceBufferPercent: 5,
    warningThresholds: [80, 90],
  },
  business: {
    name: "Business",
    stripePriceId: env.STRIPE_BUSINESS_PRICE_ID,
    stripeAnnualPriceId: env.STRIPE_BUSINESS_ANNUAL_PRICE_ID,
    seatPriceId: env.STRIPE_BUSINESS_SEAT_PRICE_ID,
    seats: 5, // included seats
    trial: null, // no trial, must upgrade from Pro
    limits: {
      storageGb: 100,
    },
    includedCredits: {
      meeting: 500,
      ai: 5000,
    },
    graceBufferPercent: 5,
    warningThresholds: [80, 90],
  },
  enterprise: {
    name: "Enterprise",
    salesLed: true, // no self-serve
    seats: null, // custom per org
    trial: null, // no trial for enterprise
    limits: null, // custom, set per-org in enterprise_limits table
    includedCredits: null, // custom per org
    graceBufferPercent: 5, // default, overridable per-org in enterprise_limits
    warningThresholds: [80, 90],
  },
} as const satisfies Record<string, BillingPlan>;

const CREDIT_COSTS = {
  aiOperations: 1, // 1 AI credit per operation
  recordings: 1, // 1 meeting credit per recording
  meetings: 1, // 1 meeting credit per meeting
  storageGb: 10, // 10 credits per GB (for overage only)
} as const;

const CREDIT_PACKS = {
  meeting: [
    { credits: 100, priceId: env.STRIPE_CREDITS_MEETING_100_PRICE_ID },
    { credits: 500, priceId: env.STRIPE_CREDITS_MEETING_500_PRICE_ID },
  ],
  ai: [
    { credits: 100, priceId: env.STRIPE_CREDITS_AI_100_PRICE_ID },
    { credits: 500, priceId: env.STRIPE_CREDITS_AI_500_PRICE_ID },
    { credits: 1000, priceId: env.STRIPE_CREDITS_AI_1000_PRICE_ID },
  ],
} as const;
```

All numbers in one place. Enterprise limits stored per-organization in `enterprise_limits` DB table.

---

## Section 2: Database Schema

### Plugin-required schema changes (migration needed)

The Better Auth Stripe plugin expects columns and tables that do not yet exist in the codebase. A database migration is required **before** the plugin can function:

1. **Add `stripeCustomerId` column** to `users` table in `src/server/db/schema/auth.ts`
2. **Add `stripeCustomerId` column** to `organizations` table in `src/server/db/schema/auth.ts`
3. **Create `subscriptions` table** — either manually in a new schema file or via Better Auth's schema generation. The plugin expects: `id`, `plan`, `referenceId`, `stripeCustomerId`, `stripeSubscriptionId`, `status`, `periodStart`, `periodEnd`, `trialStart`, `trialEnd`, `cancelAtPeriodEnd`, `cancelAt`, `canceledAt`, `endedAt`, `seats`, `billingInterval`, `stripeScheduleId`, `groupId`

Migration command: `pnpm db:generate --name add-stripe-billing-schema`

### New tables (custom billing logic)

New tables on top of what the Better Auth Stripe plugin provides.

### `usage_records`

Tracks monthly consumption per org per resource.

| Column         | Type      | Notes                                     |
| -------------- | --------- | ----------------------------------------- |
| id             | string    | PK                                        |
| organizationId | string    | FK to organizations                       |
| resourceType   | enum      | `ai_operations`, `recordings`, `meetings` |
| quantity       | integer   | Current usage count for the period        |
| periodStart    | date      | Billing period start                      |
| periodEnd      | date      | Billing period end                        |
| createdAt      | timestamp |                                           |
| updatedAt      | timestamp |                                           |

Unique constraint: `(organizationId, resourceType, periodStart)` — one row per resource per month.

**Note on storage:** Storage is tracked as a running total, not an event-based counter. It is **not** tracked in `usage_records` (which resets monthly). Instead, storage usage is calculated on-demand by querying the blob storage provider (Vercel Blob) for the org's total size. The `EntitlementService` calls this when checking storage entitlements. Storage decreases when files are deleted. Storage limits are hard caps from the plan config, not credit-based. Storage is **not** declared as a `usage` metadata resource type on actions — it is checked separately by `EntitlementService` in the upload/storage services directly.

### `credit_balances`

Prepaid overage credits per org. Two separate balances for the two credit types.

| Column         | Type      | Notes                                |
| -------------- | --------- | ------------------------------------ |
| id             | string    | PK                                   |
| organizationId | string    | FK to organizations, unique          |
| meetingBalance | decimal   | Purchased meeting credits (rollover) |
| aiBalance      | decimal   | Purchased AI credits (rollover)      |
| createdAt      | timestamp |                                      |
| updatedAt      | timestamp |                                      |

### `credit_transactions`

Audit trail for all credit movements.

| Column                | Type      | Notes                                      |
| --------------------- | --------- | ------------------------------------------ |
| id                    | string    | PK                                         |
| organizationId        | string    | FK to organizations                        |
| creditType            | enum      | `meeting`, `ai`                            |
| amount                | decimal   | Positive = purchase, negative = deduction  |
| type                  | enum      | `purchase`, `deduction`, `refund`, `reset` |
| description           | string    | Human-readable description                 |
| stripePaymentIntentId | string    | Nullable, for purchases                    |
| createdAt             | timestamp |                                            |

### `enterprise_limits`

Custom limits for enterprise orgs, overrides config.

| Column             | Type      | Notes                                     |
| ------------------ | --------- | ----------------------------------------- |
| id                 | string    | PK                                        |
| organizationId     | string    | FK to organizations, unique               |
| meetingCredits     | integer   | Monthly included meeting credits          |
| aiCredits          | integer   | Monthly included AI credits               |
| storageGb          | integer   | Storage limit                             |
| seats              | integer   | Max seats                                 |
| graceBufferPercent | integer   | Default 5, overridable per enterprise org |
| createdAt          | timestamp |                                           |
| updatedAt          | timestamp |                                           |

---

## Section 3: Entitlement & Usage Checking

### EntitlementService

Answers "can this org do X?":

- `checkEntitlement(orgId, resourceType)` returns `{ allowed, remaining, limit, usagePercent, warning? }`
- Reads org's active subscription plan from `subscriptions` table
- If `trialing` → applies `creditMultiplier` / `limitMultiplier` (0.35) to included credits and limits
- Looks up limits from central config (or `enterprise_limits` for enterprise)
- Queries `usage_records` for current month consumption
- Consumption order for credits:
  1. Included monthly credits (use-it-or-lose-it, no rollover)
  2. Purchased credit balance (persistent, rollover)
  3. 5% grace buffer over included amount
  4. Hard block → prompt to buy credit pack

### UsageService

Records consumption:

- `recordUsage(orgId, resourceType, quantity)` → upserts current month's `usage_records`
- After recording, calls `EntitlementService.checkEntitlement` to evaluate thresholds
- If 80% or 90% threshold crossed → triggers notification via `BillingNotificationService`
- Returns updated entitlement status

### Integration via next-safe-action middleware

Usage checking is implemented as middleware in the action client chain (same pattern as audit logging):

```
1. actionLoggerMiddleware
2. authenticationMiddleware
3. auditLoggingMiddleware         ← MOVED UP: logs all attempts including blocked ones
4. subscriptionMiddleware         ← NEW: blocks expired/no-subscription orgs
5. usageMiddleware                ← NEW: entitlement check + usage recording
6. cacheInvalidationMiddleware
```

**Note:** Audit logging is moved before subscription/usage middleware so that blocked access attempts (expired trials, quota exceeded) are captured in the audit trail for compliance. The subscription and usage middleware log the block reason in `ctx.audit.metadata` before returning the error.

**Metadata schema extension** — the `schemaMetadata` Zod schema in `action-client.ts` must be extended with optional fields:

```typescript
usage: z.object({
  resourceType: z.enum(["ai_operations", "recordings", "meetings"]),
  quantity: z.number(),
}).optional(),
skipSubscriptionCheck: z.boolean().optional(),
```

All existing actions remain valid since both fields are optional.

Actions declare their resource consumption in metadata:

```typescript
export const createRecording = authorizedActionClient
  .metadata({
    name: "create-recording",
    usage: { resourceType: "recordings", quantity: 1 },
    // ...existing audit, permissions metadata
  })
  .schema(createRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    // No entitlement check needed — middleware handled it
    // ctx.entitlement available if needed
  });
```

Actions without `usage` metadata pass through untouched.

**All services return `Result<T, ActionError>`** from neverthrow, consistent with the existing service layer pattern.

---

## Section 4: Credit System

### Two credit types

- **Meeting credits**: consumed by recordings and meetings (1 credit each)
- **AI credits**: consumed by AI operations (1 credit each)

### Monthly included credits

Each tier includes credits that reset every billing cycle. These are calculated from config, not stored — `EntitlementService` derives them from the plan.

Trial orgs get 35% of Pro's included credits:

- Meeting: 17 (50 \* 0.35, rounded)
- AI: 175 (500 \* 0.35, rounded)

### Purchased credits

Stored in `credit_balances` table. Never expire, roll over indefinitely. Only consumed after included monthly credits are exhausted.

### Credit deduction (inside usageMiddleware)

1. Usage within included monthly credits → allowed, no deduction
2. Included credits exhausted, within 5% grace buffer → allowed, warning returned
3. Past grace buffer → check `credit_balances` for matching credit type
4. Credits available → atomic conditional UPDATE to prevent race conditions:
   ```sql
   UPDATE credit_balances
   SET meeting_balance = meeting_balance - :amount
   WHERE organization_id = :orgId
     AND meeting_balance >= :amount
   ```
   If zero rows updated → insufficient credits. On success → log `credit_transactions` in same transaction.
5. No credits → hard block with upgrade/purchase CTA

### Credit purchase flow

1. User selects a credit pack on billing page
2. Server action creates a Stripe Checkout Session with `mode: 'payment'` (one-time) directly via Stripe SDK
3. Renders `<EmbeddedCheckout>` with the session's `client_secret`
4. On `payment_intent.succeeded` webhook (with credit pack metadata) → increment `credit_balances`, log `credit_transactions`

---

## Section 5: Better Auth Stripe Plugin Configuration

Added to `auth.ts` plugins array:

```typescript
stripe({
  stripeClient,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,

  organization: {
    enabled: true, // customers are orgs, not users
  },

  subscription: {
    enabled: true,
    plans: [
      {
        name: "pro",
        priceId: env.STRIPE_PRO_PRICE_ID,
        annualDiscountPriceId: env.STRIPE_PRO_ANNUAL_PRICE_ID,
        limits: BILLING_PLANS.pro.limits,
        freeTrial: {
          days: 14,
          onTrialStart: /* send trial started email */,
          onTrialEnd: /* send welcome to Pro email */,
          onTrialExpired: /* send trial expired email, lock access */,
        },
      },
      {
        name: "business",
        priceId: env.STRIPE_BUSINESS_PRICE_ID,
        annualDiscountPriceId: env.STRIPE_BUSINESS_ANNUAL_PRICE_ID,
        seatPriceId: env.STRIPE_BUSINESS_SEAT_PRICE_ID,
        limits: BILLING_PLANS.business.limits,
      },
    ],

    authorizeReference: /* verify user is owner/admin of org */,

    getCheckoutSessionParams: async () => ({
      params: {
        ui_mode: "embedded",
        return_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      },
    }),

    onSubscriptionComplete: /* init usage_records, init credit_balances, send email */,
    onSubscriptionUpdate: /* handle upgrade/downgrade, adjust credits */,
    onSubscriptionCancel: /* send cancellation email, schedule lockout */,
  },

  onEvent: async (event) => {
    // invoice.paid → reset monthly included credits (new billing cycle)
    // invoice.payment_failed → send payment failed email, set past_due warning
    // customer.subscription.trial_will_end → send trial ending email (3 days before)
    // payment_intent.succeeded (with credit metadata) → add to credit_balances
  },
})
```

Key details:

- `ui_mode: "embedded"` in `getCheckoutSessionParams` makes the plugin return a `client_secret` for `<EmbeddedCheckout>` instead of a redirect URL.
- The `stripe()` plugin must be added **before** `nextCookies()` in the plugins array — `nextCookies()` must remain the last plugin.

---

## Section 6: Access Control & Trial Gating

### Subscription states

| State                      | Access                         | UI                          |
| -------------------------- | ------------------------------ | --------------------------- |
| `trialing`                 | Full Pro at 35% credits/limits | Trial countdown banner      |
| `active`                   | Full access per tier           | Normal                      |
| `past_due`                 | Full access (Stripe retries)   | Warning banner              |
| `canceled` (within period) | Full access until period end   | "Canceling on [date]" badge |
| expired / no subscription  | Locked out                     | Redirect to billing page    |

### subscriptionMiddleware (action client)

Runs after auth, before usage checks:

- `trialing` or `active` → pass through
- `past_due` → pass through, attach warning to context
- `canceled` (within period) → pass through
- expired / no subscription → return forbidden error

### Page-level gating

Server component layout check:

- No valid subscription → redirect to `/settings/billing` with "trial ended" message
- Billing page, auth pages, onboarding always accessible

### Actions that skip subscription check

Actions with `metadata.skipSubscriptionCheck: true`:

- Billing actions (subscribe, buy credits, manage payment)
- Auth actions (sign out, update profile)
- Organization read actions

---

## Section 7: Embedded Checkout & Billing UI

### Pages

- `/settings/billing` — main billing hub (plan info, usage dashboard, credit purchase)
- `/settings/billing/checkout` — embedded Stripe checkout for subscriptions
- `/settings/billing/credits` — embedded checkout for credit pack purchases

### Components

```
src/features/billing/
├── components/
│   ├── billing-overview.tsx        # main dashboard (RSC)
│   ├── usage-dashboard.tsx         # credit/storage usage bars (RSC)
│   ├── plan-card.tsx               # individual plan display (RSC)
│   ├── pricing-grid.tsx            # plan comparison - 3 tiers (RSC)
│   ├── credit-pack-card.tsx        # purchasable credit pack (RSC)
│   ├── embedded-checkout.tsx       # 'use client' - Stripe EmbeddedCheckout wrapper
│   ├── trial-banner.tsx            # countdown during trial (RSC)
│   └── past-due-banner.tsx         # payment failed warning (RSC)
├── actions/
│   ├── create-checkout-session.ts  # subscription checkout via plugin
│   └── create-credit-purchase.ts   # credit pack via Stripe SDK directly
├── queries/                        # re-exports from src/server/cache/ for feature-local imports
│   └── index.ts                    # barrel export of billing cache functions
├── hooks/
│   └── use-checkout.ts             # manages embedded checkout flow ('use client')
└── validation/
    ├── checkout.schema.ts
    └── credit-purchase.schema.ts
```

### Billing page states

- **Trialing**: Shows plan info, trial countdown, usage at reduced limits, upgrade CTA
- **Active**: Shows plan info, full usage dashboard, manage subscription, buy credits
- **No subscription / expired**: Becomes pricing page with Pro, Business, Enterprise cards

All billing pages use Suspense boundaries for async data fetching and error boundaries for Stripe API failures. The `embedded-checkout.tsx` component wraps `<EmbeddedCheckout>` in both Suspense (loading skeleton) and an error boundary (retry CTA).

---

## Section 8: Webhook Handling & Lifecycle Events

### Plugin-handled (automatic)

- `checkout.session.completed` → creates/updates subscription record
- `customer.subscription.created` → syncs to DB
- `customer.subscription.updated` → updates status, cancellation, seats
- `customer.subscription.deleted` → marks canceled

### Custom handling via `onEvent`

| Stripe Event                                 | Action                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `invoice.paid`                               | Reset monthly usage records (new cycle). Included credits recalculate from config. See reset strategy below. |
| `invoice.payment_failed`                     | Send payment failed email. Flag `past_due` for UI banner.                                                    |
| `customer.subscription.trial_will_end`       | Send "trial ending in 3 days" email.                                                                         |
| `payment_intent.succeeded` (credit metadata) | Increment `credit_balances`. Log `credit_transactions`.                                                      |

### Monthly credit reset strategy

`invoice.paid` handles reset for active monthly subscriptions, but does not cover all cases:

- **Trial period**: No invoice is generated. Initial period boundaries are set in `onSubscriptionComplete` when the trial subscription is created. Usage records are initialized with `periodStart`/`periodEnd` matching the trial dates.
- **Annual subscriptions**: `invoice.paid` fires once per year. For annual plans, a **cron job** runs daily, checks if any org's current usage period has ended, and creates new usage records with zeroed counters. The cron checks `usage_records.periodEnd < now()` and creates the next monthly period.
- **Monthly subscriptions**: `invoice.paid` handles reset naturally.

The `EntitlementService` always uses `usage_records` for the current period — it queries by `periodStart <= now < periodEnd`. If no record exists for the current period (edge case), it creates one with zero usage.

### Email templates

| Event                 | Template                      | Status |
| --------------------- | ----------------------------- | ------ |
| Trial started         | `stripe-trial-started.tsx`    | Exists |
| Trial ending (3 days) | `stripe-trial-ending.tsx`     | New    |
| Trial expired         | `stripe-expired.tsx`          | Exists |
| Subscription active   | `stripe-paid-started.tsx`     | Exists |
| Subscription canceled | `stripe-cancelled.tsx`        | Exists |
| Payment failed        | `stripe-payment-failed.tsx`   | New    |
| Credit pack purchased | `stripe-credit-purchased.tsx` | New    |
| Usage at 80%/90%      | `stripe-usage-warning.tsx`    | New    |

---

## Section 9: Upgrade/Downgrade & Enterprise

### Pro → Business (immediate with proration)

1. User clicks "Upgrade to Business"
2. `authorizeReference` verifies owner/admin
3. Plugin calls `subscription.upgrade({ plan: "business", scheduleAtPeriodEnd: false })`
4. Stripe prorates charges
5. Embedded checkout for upgraded plan
6. On success: included credits bump to Business tier, usage records carry over

### Business → Pro (end of cycle)

1. User clicks "Downgrade to Pro"
2. Plugin calls `subscription.upgrade({ plan: "pro", scheduleAtPeriodEnd: true })`
3. Stripe creates subscription schedule
4. UI shows "Downgrading to Pro on [date]"
5. On next `invoice.paid`: plan switches, credits drop to Pro tier, purchased credits preserved

### Downgrade protection

Before downgrading, verify current usage doesn't exceed lower tier limits. If storage exceeds Pro's limit → block with "reduce storage to X GB before downgrading."

### Business seat changes

- Adding seats: immediate, prorated via plugin's `seatPriceId` sync
- Removing seats: only when member count drops below current seat count
- Plugin's `afterMemberChange` hook syncs to Stripe automatically

### Enterprise (sales-led)

1. "Contact Sales" CTA → form or mailto link
2. After sales conversation, manually create subscription in Stripe dashboard
3. Set custom limits in `enterprise_limits` table via admin action
4. Plugin webhook picks up subscription creation
5. No self-serve upgrade/downgrade

---

## Section 10: Environment Variables

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_PRICE_ID
STRIPE_PRO_ANNUAL_PRICE_ID
STRIPE_BUSINESS_PRICE_ID
STRIPE_BUSINESS_ANNUAL_PRICE_ID
STRIPE_BUSINESS_SEAT_PRICE_ID
STRIPE_CREDITS_MEETING_100_PRICE_ID
STRIPE_CREDITS_MEETING_500_PRICE_ID
STRIPE_CREDITS_AI_100_PRICE_ID
STRIPE_CREDITS_AI_500_PRICE_ID
STRIPE_CREDITS_AI_1000_PRICE_ID
```

---

## Section 11: Complete File Manifest

### New files

```
# Config
src/config/billing.ts

# Schema
src/server/db/schema/usage-records.ts
src/server/db/schema/credit-balances.ts
src/server/db/schema/credit-transactions.ts
src/server/db/schema/enterprise-limits.ts

# Data access
src/server/data-access/subscriptions.queries.ts
src/server/data-access/usage-records.queries.ts
src/server/data-access/credit-balances.queries.ts
src/server/data-access/credit-transactions.queries.ts
src/server/data-access/enterprise-limits.queries.ts

# Services
src/server/services/entitlement.service.ts
src/server/services/usage.service.ts
src/server/services/credit.service.ts
src/server/services/billing-notification.service.ts

# Middleware
src/lib/server-action-client/subscription-middleware.ts
src/lib/server-action-client/usage-middleware.ts

# Feature module
src/features/billing/components/billing-overview.tsx
src/features/billing/components/usage-dashboard.tsx
src/features/billing/components/plan-card.tsx
src/features/billing/components/pricing-grid.tsx
src/features/billing/components/credit-pack-card.tsx
src/features/billing/components/embedded-checkout.tsx
src/features/billing/components/trial-banner.tsx
src/features/billing/components/past-due-banner.tsx
src/features/billing/actions/create-checkout-session.ts
src/features/billing/actions/create-credit-purchase.ts
src/server/cache/billing-overview.cache.ts
src/server/cache/usage-data.cache.ts
src/features/billing/queries/index.ts
src/features/billing/hooks/use-checkout.ts
src/features/billing/validation/checkout.schema.ts
src/features/billing/validation/credit-purchase.schema.ts

# Email templates
src/emails/templates/stripe-trial-ending.tsx
src/emails/templates/stripe-payment-failed.tsx
src/emails/templates/stripe-credit-purchased.tsx
src/emails/templates/stripe-usage-warning.tsx

# Routes
src/app/(main)/settings/billing/page.tsx
src/app/(main)/settings/billing/checkout/page.tsx
src/app/(main)/settings/billing/credits/page.tsx

# Cron
src/app/api/cron/reset-usage-periods/route.ts    # Daily cron: resets usage periods for annual plans
```

### Modified files

```
src/lib/auth.ts                                    # Add stripe plugin (before nextCookies)
src/lib/server-action-client/action-client.ts      # Add subscription + usage middleware, extend schemaMetadata
src/server/db/schema/auth.ts                       # Add stripeCustomerId to users + organizations tables
src/server/db/schema/index.ts                      # Export new schemas (subscriptions, usage, credits, enterprise)
src/server/services/rate-limiter.service.ts        # Expand UserTier to support pro/business/enterprise/trialing
```

### Migration required

```bash
pnpm db:generate --name add-stripe-billing-schema
```

This migration adds:

- `stripeCustomerId` column to `users` and `organizations` tables
- `subscriptions` table (Better Auth Stripe plugin schema)
- `usage_records`, `credit_balances`, `credit_transactions`, `enterprise_limits` tables
