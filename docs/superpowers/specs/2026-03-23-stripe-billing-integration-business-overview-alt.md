# Inovy Billing & Subscription Model — Alternative: Pure Subscription

## Executive Summary

This document presents an alternative billing model where all usage is bundled into the subscription price. There are no separate credits, no credit packs, and no overage purchases. Each tier includes a fixed monthly allowance of meetings, AI operations, storage, and seats. When a limit is reached, the feature is blocked until the next billing cycle or the user upgrades to a higher tier.

This is a simpler model that trades flexibility (no overage option) for predictability (users always know exactly what they'll pay).

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

| Resource          | Pro       | Business       | Enterprise |
| ----------------- | --------- | -------------- | ---------- |
| **Meetings**      | 50/month  | 500/month      | Custom     |
| **Recordings**    | 50/month  | 500/month      | Custom     |
| **AI operations** | 500/month | 5,000/month    | Custom     |
| **Storage**       | 10 GB     | 100 GB         | Custom     |
| **Seats**         | 1         | 5 (expandable) | Custom     |

All monthly allowances reset at the start of each billing cycle. Unused allowance does not roll over.

**No credits, no overage purchases.** When a limit is reached, that feature is blocked until the next cycle or the user upgrades.

### Trial Experience

New users get a **14-day free trial** of the Pro plan with **35% of Pro's monthly allowances**:

| Resource      | Trial Allowance |
| ------------- | --------------- |
| Meetings      | ~17             |
| Recordings    | ~17             |
| AI operations | ~175            |
| Storage       | ~3.5 GB         |

After the trial, users must subscribe to Pro (or higher) to continue using the platform. There is no free tier.

---

## Usage Limits & Enforcement

### How Limits Work

Each resource has a hard monthly cap. Usage is tracked per organization — all members share the same pool.

| Threshold     | What Happens                                                     |
| ------------- | ---------------------------------------------------------------- |
| **80% used**  | Email notification: "You've used 80% of your monthly [resource]" |
| **90% used**  | Email notification: "You've used 90% of your monthly [resource]" |
| **100% used** | Feature blocked with upgrade CTA: "Upgrade to Business for more" |

There is no grace buffer and no overage option. The limit is the limit.

### What "Blocked" Means

When a limit is reached:

- **Meetings**: Cannot start or join new meetings through the platform
- **Recordings**: Cannot start new recordings; existing recordings remain accessible
- **AI operations**: AI features (summaries, analysis, insights) become unavailable
- **Storage**: Cannot upload new files; existing files remain accessible and downloadable

Users see a clear message explaining they've hit their limit, with two options:

1. Wait for the next billing cycle (limits reset automatically)
2. Upgrade to a higher tier for more capacity

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

**Downgrade protection:** If current usage exceeds the lower tier's limits (e.g., storage exceeds Pro's 10 GB), the downgrade is blocked with a message to reduce usage first.

### Payment Failures

When a payment fails:

- User is notified via email
- A warning banner appears in the app
- Stripe automatically retries the payment over several days
- If all retries fail, the subscription expires and the org is locked out

---

## Enterprise Tier

Enterprise is **sales-led** — there is no self-serve checkout.

- Custom limits for all resources (meetings, recordings, AI operations, storage, seats)
- Limits configured individually per organization after a sales conversation
- No self-serve upgrade or downgrade — all changes go through sales

The "Enterprise" card on the pricing page shows a **"Contact Sales"** CTA.

---

## Billing Management

Users manage their subscription through the **Settings → Billing** page:

- **Plan overview** — current tier, billing cycle, next payment date
- **Usage dashboard** — visual progress bars for meetings, recordings, AI operations, and storage
- **Manage subscription** — Stripe Customer Portal for upgrading, downgrading, payment method updates, invoices, and cancellation

The checkout experience is **embedded within the app** for a seamless experience.

---

## Billing Scope

Billing is **per organization**, not per user:

- **Pro** = individual user in their own organization (1 seat)
- **Business** = team organization with multiple seats (5 included, more available)
- **Enterprise** = large organization with custom seat count

All members share the organization's usage allowances. The organization owner (or admin) manages billing.

---

## Comparison: This Model vs. Credit-Based Model

| Aspect                     | Pure Subscription (this doc)                 | Credit-Based (Option A)                                 |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| **Pricing simplicity**     | Very simple — one price, everything included | More complex — subscription + optional credit packs     |
| **Revenue per user**       | Fixed per tier                               | Higher potential via credit pack upsells                |
| **User experience**        | Predictable, no surprise charges             | More flexible, users can buy more when needed           |
| **Overage handling**       | Hard block at limit                          | Soft block with purchase option                         |
| **Implementation**         | Simpler — no credit system to build          | More complex — credits, transactions, atomic deductions |
| **Support burden**         | "Why can't I do X?" → "Upgrade"              | Credit balance questions, pack pricing questions        |
| **Churn risk**             | Higher — users hit wall, may leave           | Lower — users can buy through the wall                  |
| **Upsell path**            | Only tier upgrades                           | Tier upgrades + credit packs                            |
| **Billing predictability** | 100% predictable for users                   | Mostly predictable, credit packs are optional           |

### Recommendation

The **credit-based model (Option A)** is recommended for Inovy because:

1. Meeting and AI usage is inherently variable — some months are heavier than others
2. Hard blocking mid-workflow (e.g., during an important meeting) creates a poor experience
3. Credit packs provide an additional revenue stream without requiring tier upgrades
4. The credit system is already designed and spec'd — implementation cost is known

The pure subscription model is viable as a **launch simplification** if speed-to-market is the priority, with credits added later as an enhancement.

---

## Key Business Decisions

| Decision                                | Rationale                                                        |
| --------------------------------------- | ---------------------------------------------------------------- |
| No free tier                            | Ensures all active users are paying customers after trial        |
| 14-day trial at 35% capacity            | Gives users enough to evaluate without burning full quotas       |
| Hard block at limit (no overage)        | Simple, predictable — users always know what they'll pay         |
| Upgrades immediate, downgrades deferred | Lets users unlock value fast while preventing plan gaming        |
| Enterprise is sales-led                 | Allows custom pricing, limits, and onboarding for large accounts |
| No grace buffer                         | Keeps the model simple — the limit is the limit                  |

---

## Notifications

| Event                      | Email                                                           |
| -------------------------- | --------------------------------------------------------------- |
| Trial started              | Welcome email with trial details and end date                   |
| Trial ending (3 days left) | Reminder to subscribe                                           |
| Trial expired              | "Your trial has ended" with subscribe CTA                       |
| Subscription active        | Welcome to [plan] confirmation                                  |
| Subscription canceled      | Cancellation confirmation with end date                         |
| Payment failed             | "Update your payment method" with CTA                           |
| Usage at 80%               | "You've used 80% of your monthly [resource] — upgrade for more" |
| Usage at 100%              | "[Resource] limit reached — upgrade to continue"                |

---

## Revenue Streams

1. **Subscription revenue** — recurring monthly/annual payments for Pro and Business
2. **Seat revenue** — per-seat charges for Business organizations exceeding 5 included seats
3. **Enterprise contracts** — custom pricing for large organizations

---

## Appendix: Glossary

| Term                  | Definition                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| **Monthly allowance** | Fixed usage limit included with the subscription; resets each billing cycle |
| **Hard block**        | Feature becomes unavailable when the monthly allowance is exhausted         |
| **Proration**         | Adjusting charges proportionally when changing plans mid-cycle              |
| **Seat**              | A user slot within an organization; Pro has 1, Business has 5 included      |
