# Inovy Billing & Subscription Model

## Executive Summary

This document outlines Inovy's billing and subscription architecture. We're introducing a three-tier model (Pro, Business, Enterprise) with a 14-day free trial, usage-based metering, and a credit system for overage management. Payments are processed through Stripe.

---

## Subscription Tiers

|                | Pro                      | Business                                | Enterprise          |
| -------------- | ------------------------ | --------------------------------------- | ------------------- |
| **Target**     | Individual professionals | Teams & departments                     | Large organizations |
| **Seats**      | 1                        | 5 included (additional seats available) | Custom              |
| **Billing**    | Monthly or annual        | Monthly or annual                       | Custom (sales-led)  |
| **Trial**      | 14 days free             | No trial (upgrade from Pro)             | No trial            |
| **Self-serve** | Yes                      | Yes                                     | No — Contact Sales  |

---

## What's Included Per Tier

### Monthly Allowances

| Resource            | Pro       | Business    | Enterprise |
| ------------------- | --------- | ----------- | ---------- |
| **Meeting credits** | 50/month  | 500/month   | Custom     |
| **AI credits**      | 500/month | 5,000/month | Custom     |
| **Storage**         | 10 GB     | 100 GB      | Custom     |

Meeting credits are consumed when recording or joining meetings (1 credit each). AI credits are consumed when using AI-powered features like transcription analysis, summaries, and insights (1 credit each).

Monthly allowances reset at the start of each billing cycle and do not roll over.

### Trial Experience

New users get a **14-day free trial** of the Pro plan with **35% of Pro's monthly allowances**:

| Resource        | Trial Allowance |
| --------------- | --------------- |
| Meeting credits | ~17             |
| AI credits      | ~175            |
| Storage         | ~3.5 GB         |

After the trial, users must subscribe to Pro (or higher) to continue using the platform. There is no free tier.

---

## Credit System

### How Credits Work

Credits are Inovy's universal currency for metered usage. There are two types:

1. **Meeting credits** — used for recordings and meetings
2. **AI credits** — used for AI-powered features

Each tier includes a monthly credit allowance. When that allowance runs low or is exhausted, users can purchase additional credit packs.

### Usage Thresholds & Overage Handling

| Threshold                      | What Happens                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **80% used**                   | Email notification: "You've used 80% of your monthly allowance"                                                                                 |
| **90% used**                   | Email notification: "You've used 90% of your monthly allowance"                                                                                 |
| **100% used**                  | 5% grace buffer — usage continues with a warning                                                                                                |
| **105% used (grace exceeded)** | If purchased credits available → deducted automatically. If no credits → feature blocked until credits are purchased or the next billing cycle. |

### Purchasing Credits

Users can buy credit packs at any time from the billing settings page. Purchased credits:

- Are **paid upfront** (one-time payment, not a subscription)
- **Never expire** — they roll over indefinitely across billing cycles
- Are only consumed **after** the monthly included allowance is exhausted

Available packs:

| Meeting Credits | AI Credits    |
| --------------- | ------------- |
| 100 credits     | 100 credits   |
| 500 credits     | 500 credits   |
| —               | 1,000 credits |

Pricing for credit packs is configured in Stripe and can be adjusted independently of subscription pricing.

---

## Subscription Lifecycle

### New User Journey

```
Sign up → 14-day Pro trial (35% allowance) → Choose plan or lose access
```

1. User creates an account
2. Automatically starts a 14-day Pro trial
3. Receives a "trial started" email
4. At day 11 (3 days before expiry), receives a "trial ending" email
5. Before trial ends: subscribes to Pro or Business → continues seamlessly
6. Trial expires without subscribing → locked out of the platform (billing page remains accessible)

### Plan Changes

| Change                         | When It Takes Effect         | Billing Impact                                         |
| ------------------------------ | ---------------------------- | ------------------------------------------------------ |
| **Pro → Business** (upgrade)   | Immediately                  | Prorated — user pays the difference for remaining days |
| **Business → Pro** (downgrade) | End of current billing cycle | No immediate charge; new rate starts next cycle        |
| **Any → Enterprise**           | After sales conversation     | Custom pricing, manually provisioned                   |
| **Cancel subscription**        | End of current billing cycle | Full access until period ends                          |

**Downgrade protection:** If an organization's current storage usage exceeds the lower tier's limit, the downgrade is blocked with a message to reduce storage first. This prevents data loss.

### Payment Failures

When a payment fails:

- User is notified via email
- A warning banner appears in the app
- Stripe automatically retries the payment over several days
- If all retries fail, the subscription moves to an expired state and the org is locked out

---

## Enterprise Tier

Enterprise is **sales-led** — there is no self-serve checkout.

- Enterprise organizations get **custom limits** for all resources (meeting credits, AI credits, storage, seats)
- Limits are configured individually per organization after a sales conversation
- Enterprise includes a custom grace buffer percentage (default 5%, adjustable)
- No self-serve upgrade or downgrade — all changes go through sales

The "Enterprise" card on the pricing page shows a **"Contact Sales"** CTA instead of a subscribe button.

---

## Billing Management

Users manage their subscription through the **Settings → Billing** page, which provides:

- **Plan overview** — current tier, billing cycle, next payment date
- **Usage dashboard** — visual progress bars for meeting credits, AI credits, and storage
- **Credit balance** — current purchased credit balances for both types
- **Buy credits** — purchase credit packs directly from the page
- **Manage subscription** — redirects to Stripe's Customer Portal for:
  - Upgrading or downgrading plans
  - Updating payment method
  - Viewing invoices and payment history
  - Canceling subscription

The checkout experience is **embedded within the app** (not a redirect to Stripe) for a seamless user experience.

---

## Billing Scope

Billing is **per organization**, not per user:

- **Pro** = individual user in their own organization (1 seat)
- **Business** = team organization with multiple seats (5 included, more available)
- **Enterprise** = large organization with custom seat count

All members of an organization share the organization's credit allowances and purchased credits. The organization owner (or admin) manages billing.

---

## Key Business Decisions

| Decision                                | Rationale                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| No free tier                            | Ensures all active users are paying customers after trial                      |
| 14-day trial at 35% capacity            | Gives users enough to evaluate without consuming full quotas for free          |
| Two credit types (meeting + AI)         | Matches natural usage patterns — some users need more meetings, others more AI |
| Purchased credits never expire          | Reduces customer complaints and support tickets, builds goodwill               |
| Upgrades immediate, downgrades deferred | Lets users unlock value fast while preventing plan gaming                      |
| Enterprise is sales-led                 | Allows custom pricing, limits, and onboarding for large accounts               |
| 5% grace buffer before hard block       | Prevents frustration from hitting exact limits mid-workflow                    |

---

## Notifications

Users receive email notifications at these moments:

| Event                      | Email                                          |
| -------------------------- | ---------------------------------------------- |
| Trial started              | Welcome email with trial details and end date  |
| Trial ending (3 days left) | Reminder to subscribe                          |
| Trial expired              | "Your trial has ended" with subscribe CTA      |
| Subscription active        | Welcome to [plan] confirmation                 |
| Subscription canceled      | Cancellation confirmation with end date        |
| Payment failed             | "Update your payment method" with CTA          |
| Credit pack purchased      | Purchase confirmation with new balance         |
| Usage at 80%               | "You've used 80% of your [resource] allowance" |
| Usage at 90%               | "You've used 90% of your [resource] allowance" |

---

## Revenue Streams

1. **Subscription revenue** — recurring monthly/annual payments for Pro and Business tiers
2. **Seat revenue** — per-seat charges for Business organizations exceeding the 5 included seats
3. **Credit pack revenue** — one-time purchases for overage credits
4. **Enterprise contracts** — custom pricing for large organizations

---

## Appendix: Glossary

| Term                  | Definition                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Meeting credit**    | A unit consumed when recording or attending a meeting (1 credit per event)                     |
| **AI credit**         | A unit consumed when using AI features like analysis or summaries (1 credit per operation)     |
| **Included credits**  | Monthly allowance that comes with the subscription tier; resets each cycle, doesn't roll over  |
| **Purchased credits** | Credits bought via credit packs; never expire, roll over, consumed only after included credits |
| **Grace buffer**      | 5% extra usage allowed beyond the monthly limit before hard blocking                           |
| **Proration**         | Adjusting charges proportionally when changing plans mid-cycle                                 |
| **Seat**              | A user slot within an organization; Pro has 1, Business has 5 included                         |
