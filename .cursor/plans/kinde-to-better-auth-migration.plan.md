<!-- d5c80e44-581d-40a1-bdea-a8150c328de0 1ef525b5-08cc-44f6-a564-42098c2bc2cf -->
# Kinde to Better Auth Migration Plan

## Overview

Migrate authentication system from Kinde Auth to Better Auth while maintaining all existing functionality. The migration includes authentication methods, subscription management, organization support, and email notifications.

## Architecture Decisions

- **User Migration**: Start fresh (no data migration from Kinde)
- **Organizations**: Use Better Auth organization plugin (replaces Kinde organizations)
- **Subscriptions**: 
  - Free/Trial & Pro plans: User-level subscriptions
  - Enterprise plan: Organization-level subscriptions with custom billing

## Phase 1: Core Better Auth Setup

### 1.1 Install Dependencies

Install Better Auth core packages and plugins:

- `better-auth` - Core auth library
- `@better-auth/stripe` - Stripe subscription integration
- `@better-auth/passkey` - Passkey/WebAuthn support
- `stripe` - Stripe SDK (v20+)
- `resend` - Email service (if not already installed)

**Reference:** [Better Auth Installation](https://www.better-auth.com/llms.txt/docs/installation.md), [Stripe Plugin](https://www.better-auth.com/llms.txt/docs/plugins/stripe.md)

### 1.2 Database Schema Generation

**Files to create/modify:**

- `apps/web/src/server/db/schema/auth.ts` - Better Auth schema (generated via CLI)
- `apps/web/src/server/db/migrations/[timestamp]_add_better_auth_schema.sql` - Migration file

**Schema Requirements:**

- Better Auth core tables: `user`, `session`, `account`, `verification`
- Organization tables: `organization`, `member` (via Better Auth org plugin)
- Stripe tables: `subscription`, `customer` (via Better Auth Stripe plugin)
- Passkey table: `passkey` (via Better Auth passkey plugin)
- Magic link table: `magic_link` (via Better Auth magic link plugin)

**Migration Strategy:**

- Use Better Auth CLI: `npx better-auth generate` to generate schema
- Or manually create schema following [Drizzle Adapter docs](https://www.better-auth.com/llms.txt/docs/adapters/drizzle.md)
- Generate Drizzle migration: `npx drizzle-kit generate`
- Apply migration: `npx drizzle-kit migrate`
- Keep existing application tables (projects, recordings, tasks, etc.)
- Update foreign key references from `user_id` (text/Kinde ID) to `user.id` (Better Auth user ID)
- Update `organization_id` references to use Better Auth organization IDs

**Reference:** [Drizzle ORM Adapter](https://www.better-auth.com/llms.txt/docs/adapters/drizzle.md)

### 1.3 Better Auth Configuration

**File:** `apps/web/src/lib/auth.ts`

Create Better Auth instance with:

- Drizzle adapter configured with PostgreSQL provider
- Base URL configuration
- Session configuration (cookie-based, secure)
- Email configuration (Resend integration)
- Social providers (Google, Microsoft OAuth)
- Magic link plugin
- Passkey plugin
- Stripe plugin (with webhook secret and subscription plans)
- Organization plugin
- Next.js cookies plugin

**Key Configuration:**

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import { nextCookies } from "better-auth/next-js";
import Stripe from "stripe";
import { db } from "@/server/db";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      // Send via Resend
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID || "common",
    },
  },
  plugins: [
    organization(),
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        // Send via Resend
      },
    }),
    passkey({
      rpID: process.env.BETTER_AUTH_URL?.replace(/https?:\/\//, "") || "localhost",
      rpName: "Inovy",
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_PRICE_ID!,
          },
          {
            name: "enterprise",
            priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
          },
        ],
      },
      authorizeReference: async ({ referenceId, user }) => {
        // For Enterprise org subscriptions, verify user is org admin
        // For Pro user subscriptions, verify referenceId matches userId
        return true; // Implement authorization logic
      },
    }),
    nextCookies(), // Must be last plugin
  ],
});
```

**Reference:** [Stripe Plugin Configuration](https://www.better-auth.com/llms.txt/docs/plugins/stripe.md), [Organization Plugin](https://www.better-auth.com/llms.txt/docs/plugins/organization.md)

### 1.4 Next.js API Route Setup

**File:** `apps/web/src/app/api/auth/[...all]/route.ts`

Replace Kinde auth route handler with Better Auth handler:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### 1.5 Stripe Webhook Handler

**File:** `apps/web/src/app/api/webhooks/stripe/route.ts`

Create Stripe webhook endpoint for subscription events:

- Handle `checkout.session.completed`
- Handle `customer.subscription.updated`
- Handle `customer.subscription.deleted`
- Handle `invoice.paid` (for usage-based billing)

## Phase 2: Authentication Pages & Components

### 2.1 Sign Up Page

**File:** `apps/web/src/app/sign-up/page.tsx`

Create sign-up page with:

- Email/password form
- Social login buttons (Google, Microsoft)
- Magic link option
- Link to sign-in page
- Email verification flow

### 2.2 Sign In Page

**File:** `apps/web/src/app/sign-in/page.tsx`

Create sign-in page with:

- Email/password form
- Social login buttons (Google, Microsoft)
- Magic link option
- Passkey option (if user has registered passkeys)
- Link to sign-up page
- Password reset link

### 2.3 Auth Client Setup

**File:** `apps/web/src/lib/auth-client.ts`

Create Better Auth client instance:

```typescript
import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    magicLinkClient(),
    passkeyClient(),
    stripeClient(),
  ],
});
```

### 2.4 Update Auth Provider

**File:** `apps/web/src/providers/AuthProvider.tsx`

Replace KindeProvider with Better Auth context provider (if needed) or use direct client hooks.

### 2.5 Update Protected Page Component

**File:** `apps/web/src/components/protected-page.tsx`

Update to use Better Auth session:

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

### 2.6 Update Header Auth Buttons

**File:** `apps/web/src/components/header-auth-buttons.tsx`

Replace Kinde hooks with Better Auth client hooks:

- `useSession()` instead of `useKindeBrowserClient()`
- `signOut()` instead of `LogoutLink`
- Update user avatar and dropdown menu

## Phase 3: Session Management & Caching

### 3.1 Server-Side Session Helper

**File:** `apps/web/src/lib/auth.ts` (update existing)

Create helper function using Next.js 'use cache' directive:

```typescript
import { cache } from "react";
import { headers } from "next/headers";

export const getSession = cache(async () => {
  return await auth.api.getSession({ headers: await headers() });
});
```

### 3.2 Update Middleware

**File:** `apps/web/src/proxy.ts` (or create `middleware.ts`)

Replace Kinde middleware with Better Auth middleware:

- Protect routes using Better Auth session check
- Handle CORS for API routes
- Redirect unauthenticated users to sign-in

### 3.3 Update All Auth Session Calls

**Files to update:**

- All server components using `getAuthSession()`
- All server actions checking authentication
- All API routes requiring authentication

Replace with Better Auth session helpers that use 'use cache' directive.

## Phase 4: Stripe Subscription Integration

### 4.1 Subscription Plans Configuration

**File:** `apps/web/src/lib/subscriptions.ts`

Define subscription plans:

- Free/Trial: No Stripe subscription, usage limits enforced
- Pro: User-level Stripe subscription with price ID
- Enterprise: Organization-level Stripe subscription (custom pricing)

### 4.2 Subscription Management Pages

**File:** `apps/web/src/app/settings/billing/page.tsx`

Create billing page with:

- Current plan display
- Upgrade/downgrade options
- Stripe checkout session creation
- Customer portal link
- Usage metrics (for credit-based billing)

### 4.3 Stripe Checkout Integration

Use Better Auth Stripe plugin methods:

- `authClient.stripe.createCheckoutSession()` for Pro plan
- Custom checkout for Enterprise (may need custom implementation)
- Handle trial periods in Stripe product configuration

### 4.4 Subscription Status Helpers

**File:** `apps/web/src/lib/subscription-helpers.ts`

Create helpers to:

- Check user subscription status
- Check organization subscription status
- Get subscription tier (free, pro, enterprise)
- Enforce usage limits based on tier

## Phase 5: Organization Management

### 5.1 Organization Creation

Update organization creation to use Better Auth organization plugin:

- Replace Kinde organization API calls
- Use `auth.api.createOrganization()` or client methods
- Link to existing application organization settings table

### 5.2 Organization Member Management

**Files to update:**

- `apps/web/src/server/data-access/organization.queries.ts`
- Organization member listing components

Replace Kinde API calls with Better Auth organization member methods:

- `auth.api.listOrganizationMembers()`
- `auth.api.addMemberToOrganization()`
- `auth.api.removeMemberFromOrganization()`
- `auth.api.updateMemberRole()`

### 5.3 Update Organization References

Update all database queries and components that reference:

- `organizationId` (Kinde org code) → Better Auth organization ID
- Organization member lookups
- Organization settings

## Phase 6: Email Templates with Resend

### 6.1 Email Service Setup

**File:** `apps/web/src/lib/email.ts`

Create Resend email service wrapper:

- Initialize Resend client
- Create email sending functions
- Template rendering helpers

### 6.2 Email Templates

**Directory:** `apps/web/src/lib/email-templates/`

Create email templates:

- `sign-up.tsx` - Welcome email after sign-up
- `magic-link.tsx` - Magic link authentication email
- `stripe-trial-started.tsx` - Trial subscription started
- `stripe-paid-started.tsx` - Paid subscription started
- `stripe-cancelled.tsx` - Subscription cancelled
- `stripe-expired.tsx` - Subscription expired

### 6.3 Integrate Email Templates

Update Better Auth configuration to use Resend:

- `sendVerificationEmail` callback
- `sendMagicLink` callback (magic link plugin)
- Stripe webhook handlers for subscription emails

## Phase 7: Migration & Cleanup

### 7.1 Remove Kinde Dependencies

**Files to remove/update:**

- `apps/web/src/lib/kinde-api.ts` - Remove entirely
- `apps/web/src/app/api/auth/[kindeAuth]/route.ts` - Remove
- All imports of `@kinde-oss/kinde-auth-nextjs`
- All imports of `@kinde/management-api-js`

**Package.json:** Remove Kinde packages

### 7.2 Update Environment Variables

**File:** `.env.example` (update)

Remove:

- `KINDE_DOMAIN`
- `KINDE_CLIENT_ID`
- `KINDE_CLIENT_SECRET`
- `KINDE_MANAGEMENT_CLIENT_ID`
- `KINDE_MANAGEMENT_CLIENT_SECRET`

Add:

- `BETTER_AUTH_SECRET` - Secret for session encryption
- `BETTER_AUTH_URL` - Base URL for Better Auth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth client secret
- `MICROSOFT_TENANT_ID` - Microsoft tenant ID (optional)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `RESEND_API_KEY` - Resend API key
- `NEXT_PUBLIC_APP_URL` - Public app URL

### 7.3 Update RBAC Integration

**File:** `apps/web/src/lib/rbac.ts`

Update to work with Better Auth:

- Extract roles from Better Auth session
- Map Better Auth organization roles to application roles
- Update role checking functions

### 7.4 Database Foreign Key Updates

Create migration to update foreign keys:

- Change `user_id` columns from text (Kinde ID) to UUID (Better Auth user ID)
- Update `organization_id` columns to use Better Auth organization IDs
- Handle data migration for existing records (if migrating)

## Phase 8: Testing & Validation

### 8.1 Authentication Flow Testing

Test all authentication methods:

- Email/password sign up and sign in
- Google OAuth flow
- Microsoft OAuth flow
- Magic link authentication
- Passkey registration and authentication

### 8.2 Subscription Flow Testing

Test subscription flows:

- Free tier sign up
- Pro plan checkout and activation
- Enterprise organization subscription
- Trial period handling
- Subscription cancellation
- Subscription expiration

### 8.3 Email Testing

Verify all email templates:

- Sign-up welcome email
- Magic link emails
- Stripe subscription emails (trial, paid, cancelled, expired)

### 8.4 Organization Testing

Test organization features:

- Organization creation
- Member invitation and management
- Role assignment
- Organization-level subscriptions

## Implementation Notes

- **Session Caching**: Use React `cache()` and Next.js 'use cache' directive for optimal performance
- **Type Safety**: Better Auth provides full TypeScript support - leverage types throughout
- **Error Handling**: Update error handling to use Better Auth error patterns
- **Migration Strategy**: Since starting fresh, no data migration needed, but ensure all existing data references are updated
- **Stripe Integration**: Configure Stripe products and prices in Stripe dashboard before testing
- **Email Templates**: Use React Email or similar for template rendering with Resend

## Dependencies to Add

```json
{
  "better-auth": "^1.x.x",
  "@better-auth/stripe": "^1.x.x",
  "@better-auth/passkey": "^1.x.x",
  "resend": "^3.x.x",
  "stripe": "^20.x.x"
}
```

## Dependencies to Remove

```json
{
  "@kinde-oss/kinde-auth-nextjs": "^2.10.0",
  "@kinde/management-api-js": "^0.14.0"
}
```

### To-dos

- [ ] Install Better Auth packages and plugins (better-auth, @better-auth/stripe, @better-auth/passkey, resend, stripe)
- [ ] Generate Better Auth database schema using CLI and create migration file
- [ ] Create Better Auth instance configuration with Drizzle adapter, OAuth providers, plugins (magic link, passkey, stripe, organization)
- [ ] Create Next.js API route handler for Better Auth and Stripe webhook endpoint
- [ ] Create sign-up and sign-in pages with all authentication methods (email/password, Google, Microsoft, magic link, passkey)
- [ ] Create Better Auth client instance and update auth provider component
- [ ] Update getAuthSession and create session helpers using Next.js cache directive
- [ ] Update ProtectedPage component and HeaderAuthButtons to use Better Auth
- [ ] Replace Kinde middleware with Better Auth middleware for route protection
- [ ] Configure Stripe plugin, create subscription plans configuration, and build billing management page
- [ ] Replace Kinde organization API calls with Better Auth organization plugin methods
- [ ] Create Resend email service and templates for sign-up, magic link, and Stripe subscription events
- [ ] Create migration to update foreign keys from Kinde IDs to Better Auth IDs and update all queries
- [ ] Remove all Kinde packages, files, and imports from codebase
- [ ] Update .env.example with Better Auth, OAuth, Stripe, and Resend environment variables
- [ ] Update RBAC system to work with Better Auth session and organization roles