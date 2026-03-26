# EU Meeting Intelligence Launch — Design Spec

**Date**: 2026-03-26
**Author**: Nigel Janssens + Claude Code
**Status**: Draft
**Timeline**: 12 weeks (Q2 2026)
**Goal**: First paying Dutch government & business customers within 3 months

---

## Context

Inovy is an EU-native meeting intelligence platform. The core product (bot recording via Recall.ai, Dutch transcription via Deepgram, AI summaries/tasks via Claude, GDPR consent tracking, RBAC) is ~80% functional. Revenue is blocked by missing billing, broken plumbing (stubbed post-actions, slow cron polling), and absence of Dutch gov-specific compliance features.

### Target Market

- **Primary**: Dutch government organizations (ministeries, gemeenten, uitvoeringsorganisaties)
- **Secondary**: Dutch mid-size businesses (50-500 employees)
- **Buyer persona**: IT manager or team lead who needs AVG-compliant meeting recording with EU data residency
- **Purchase driver**: "Like Fireflies, but our data stays in the EU and we can prove AVG compliance to our DPO"

### Competitive Positioning

EU-native alternative to Fireflies.ai. Competes on compliance depth (not feature breadth): EU-only infrastructure, AVG-native consent tracking, Works Council workflow, self-serve DPA, PII redaction, tamper-proof audit logs, Dutch UI.

---

## Phase 1: Make It Work (Weeks 1-3)

**Exit criteria**: A bot-recorded meeting produces a Dutch transcript, summary, tasks, and emails the summary to participants without manual intervention.

### 1.1 Wire Recall.ai Real-Time Transcription (Week 1)

**Problem**: Bot-recorded meetings only get transcribed post-recording via Deepgram. Real-time transcription during bot sessions is not configured (missing provider, event subscription, schema, handler).

**Solution**:

1. **Recall.ai transcript event subscription**: Configure the Recall.ai bot to enable real-time transcription. Recall sends `transcript.data` webhook events containing partial transcript objects with speaker ID, text content, timestamps, and language.
2. **Schema**: Create a `transcript_chunks` table linked to `bot_sessions` and `recordings`:
   - `id`, `bot_session_id`, `recording_id`, `speaker_id`, `text`, `start_time`, `end_time`, `confidence`, `is_final`, `language`, `created_at`
   - Index on `(recording_id, start_time)` for ordered retrieval
3. **Webhook handler**: Extend the existing Recall webhook handler to process `transcript.data` events — validate, parse, and insert chunks into `transcript_chunks`
4. **Transcript assembly**: After bot session completes, stitch `transcript_chunks` into the final transcript on the `recordings` table (ordered by `start_time`, grouped by speaker for diarization)
5. **Fallback**: If fewer than 50% of expected chunks arrive (based on meeting duration), trigger post-recording Deepgram transcription as fallback. Log the gap for debugging.

**Affected files**:

- `src/server/services/bot-webhook.service.ts` — add `transcript.data` event handler
- `src/server/db/schema/` — new `transcript-chunks.ts` schema file
- `src/app/api/webhooks/recall/route.ts` — route new event types to handler
- `src/server/services/bot-providers/recall/recall-provider.ts` — enable transcription in bot creation config

**Testing**: Unit tests for chunk parsing and transcript assembly. Integration test with mock Recall webhook payloads.

### 1.2 Implement Post-Meeting Actions (Week 1)

**Problem**: The `meeting_post_actions` schema defines 5 action types, but all executors are stubs.

**Solution** — implement 3 of 5:

- `send_summary_email`: compose summary + action items into HTML email, send via Resend to meeting participants. Extend existing email templates at `src/emails/templates/` (which already contains Stripe-related templates like `stripe-trial-started.tsx`).
- `create_tasks`: write extracted tasks to the `tasks` table with assignment to detected speakers
- `share_recording`: generate a `meeting_share_token`, email the link to participants

**Skip for now**: `generate_followup_agenda`, `push_external`

**Integration point**: These fire via the `executePostActionsStep` in the `convertRecordingIntoAiInsights` workflow (at `src/workflows/convert-recording/steps/step-post-actions.ts`), after summarization and task extraction complete.

**Affected files**:

- `src/server/services/post-action-executor.service.ts` — implement 3 executor methods
- `src/workflows/convert-recording/steps/step-post-actions.ts` — verify wiring to executor
- `src/emails/templates/` — new `summary-email.tsx` template
- `src/emails/client.ts` — add send method for summary emails
- `src/server/data-access/` — task creation, share token generation queries

**Testing**: Unit tests for each executor. Integration test verifying the full workflow triggers post-actions.

### 1.3 Migrate Critical Crons to Azure Functions (Week 2)

**Problem**: All crons run daily on Vercel free tier. `poll-bot-status` at daily frequency is unusable (bot stuck "joining" for up to 24 hours).

**Solution**:

- Create new Azure Functions project with Terraform IaC (no existing Terraform config exists in the repo — this is greenfield infra):
  - `poll-bot-status` → every 2 minutes
  - `monitor-calendar` → every 15 minutes
  - `backfill-series` → every 2 hours
- Keep on Vercel (upgrade to Pro for flexibility):
  - `renew-drive-watches` → daily (unchanged)
  - `data-retention` → daily (unchanged)
  - `backup-verification` → monthly (unchanged)
  - `agenda-check` → every 6 hours (upgrade from daily)

**Migration approach**:

- Azure Functions call the existing Vercel API routes via HTTP (same `CRON_SECRET` auth). This avoids duplicating business logic — the functions are thin HTTP triggers.
- Keep Vercel cron routes intact as fallback during migration. Remove Vercel cron entries for migrated jobs from `vercel.json` only after Azure is verified working.
- Zero-downtime transition: run both in parallel for 48 hours, verify Azure logs, then disable Vercel entries.

**Infrastructure**:

- Azure Functions (Consumption plan, EU West region)
- New `infra/terraform/` directory at monorepo root
- CRON_SECRET auth token shared between Vercel and Azure
- Vercel Pro upgrade ($20/month)

### 1.4 End-to-End Validation & Bug Fixes (Week 3)

**Process**:

1. Schedule a real meeting on Google Meet and Microsoft Teams
2. Verify: bot joins → records → transcribes (real-time) → stores recording (Azure Blob) → summarizes → extracts tasks → sends summary email → creates tasks
3. Test with Dutch audio specifically (formal and informal)
4. Test error paths: bot fails to join → retry logic → notification
5. Test consent flow: participant requests consent → admin approves → audit trail
6. Fix whatever breaks

**Focus areas**:

- Failed transcription retry
- Failed post-actions don't block pipeline (circuit breaker)
- Bot retry logic (max 3) works under real conditions
- Workflow completes within reasonable time (<5 min for a 30-min meeting)

**Testing**: Write integration tests for the complete workflow. These tests should be runnable in CI.

---

## Phase 2: Make It Dutch Gov (Weeks 4-7)

**Exit criteria**: A Dutch government team can sign up, start a free trial, record meetings in Dutch, see compliance dashboard, download a DPA, and convert to paid — all in Dutch.

> **Note**: This phase is extended to 4 weeks (was 3) to account for Stripe integration complexity and i18n architectural setup.

### 2.1 Stripe Billing (Week 4)

#### Pricing Tiers

|                          | Starter                      | Professional            | Enterprise                |
| ------------------------ | ---------------------------- | ----------------------- | ------------------------- |
| **Price**                | ~EUR 19/seat/month           | ~EUR 39/seat/month      | Custom                    |
| **Annual**               | ~EUR 15/seat/month (20% off) | ~EUR 31/seat/month      | Custom                    |
| **Trial**                | 14 days, no CC               | 14 days, no CC          | Custom pilot              |
| **Seats**                | Up to 5                      | Unlimited               | Unlimited                 |
| **Recording**            | 40 hrs/month                 | Unlimited               | Unlimited                 |
| **Transcription**        | Dutch + English              | All supported languages | All + custom models       |
| **Summaries & Tasks**    | Yes                          | Yes                     | Yes                       |
| **RBAC**                 | Basic (admin + user)         | Full (6 roles)          | Full + custom roles       |
| **Audit logs**           | 30-day retention             | 1-year retention        | Custom retention          |
| **Compliance dashboard** | Basic                        | Full                    | Full + custom reports     |
| **DPA**                  | Standard                     | Standard                | Custom                    |
| **Support**              | Email                        | Priority email          | Dedicated account manager |

#### Technical Implementation

The `@better-auth/stripe` plugin is installed in `package.json` but **not registered** in the auth configuration. Implementation requires:

1. **Register the Stripe plugin** in `src/lib/auth.ts` — add to the plugins array alongside existing `organization`, `magicLink`, `passkey`, `twoFactor`, `nextCookies` plugins
2. **Run schema generation** — `@better-auth/stripe` adds its own tables (subscriptions, customers). Run Better Auth's schema generation and create a Drizzle migration.
3. **Create Stripe products + prices** — 3 tiers x 2 billing periods (monthly + annual) = 6 price objects in Stripe Dashboard
4. **Stripe Checkout Sessions** for subscription start
5. **Stripe Customer Portal** for self-serve management (upgrade, cancel, payment method)
6. **Webhook handler** at `/api/webhooks/stripe/route.ts` — handle events that Better Auth doesn't cover automatically: `invoice.payment_failed`, `customer.subscription.deleted`
7. **Leverage existing email templates** — `src/emails/templates/` already has `stripe-trial-started.tsx`, `stripe-paid-started.tsx`, `stripe-expired.tsx`, `stripe-cancelled.tsx`. Wire these into the billing events.
8. **Trial enforcement**: after 14 days, downgrade to read-only (past data preserved, no new recordings)
9. **Feature gating middleware**: check org subscription tier before allowing actions

#### Billing UI

- `/settings/billing` — current plan, usage meters, manage subscription button
- Pricing comparison component (reusable on marketing site)
- Upgrade prompts at feature gates (contextual, not intrusive)

### 2.2 AVG Compliance Dashboard (Week 5)

**New route**: `/admin/compliance`

**Dashboard content**:

- Active consent rates (% of participants with granted consent)
- Pending consent requests
- PII redactions performed (count, by type)
- Data retention status (recordings approaching retention limit)
- Active privacy requests (restriction, objection, deletion)
- Audit log summary (actions this period, by type)
- Export: downloadable compliance report (PDF) for DPO review

**PDF generation**: Use `@react-pdf/renderer` for server-side PDF generation. This produces React-component-based PDFs, consistent with the project's React stack. Add to `package.json`.

**Why this matters**: Dutch gov DPOs (Functionaris Gegevensbescherming) need evidence of AVG compliance for internal audits. A dashboard with exportable reports removes the need for manual evidence gathering.

**Testing**: Unit tests for compliance data aggregation queries. Snapshot test for PDF output.

### 2.3 Works Council (Ondernemingsraad) Consent Workflow (Week 5)

**New consent method**: `works_council_approval`

**Flow**:

1. Org admin navigates to `/admin/compliance/works-council`
2. Uploads OR approval document (PDF) with approval date and scope
3. System creates a `works_council_approval` record linked to org
4. All org members are marked as consented under OR agreement
5. Individual employees can still opt-out (right preserved under WOR)
6. Audit trail tracks: OR decision document, approval date, scope, individual opt-outs

**Schema changes**:

- New `works_council_approvals` table: `id`, `org_id`, `document_url`, `approval_date`, `scope_description`, `status` (active/revoked), `uploaded_by`, `created_at`
- **Migration on existing table**: Add `works_council_approval` to `consentMethodEnum` on `consent_participants` table. This is an ALTER TYPE ... ADD VALUE migration (non-reversible in Postgres, but safe — adding a value never breaks existing rows).
- Link `consent_participants.works_council_approval_id` (nullable FK) to `works_council_approvals`

**Data migration consideration**: Existing consent records are unaffected. OR-level consent creates new `consent_participants` rows for org members who don't already have one. Members with existing individual consent keep their individual record (OR consent doesn't override explicit individual consent).

**Why this matters**: Dutch organizations with 50+ employees require Ondernemingsraad approval for recording meetings. No competitor handles this. It is a procurement blocker.

**Testing**: Unit tests for consent creation, opt-out flow, and audit trail.

### 2.4 Self-Serve DPA / Verwerkersovereenkomst (Week 6)

**Route**: `/admin/compliance/dpa`

**Content**:

- Auto-generated Data Processing Agreement based on org settings
- Pre-filled with: data residency location (EU), retention period, sub-processor list, security measures, contact details
- Org admin can download as PDF (using `@react-pdf/renderer`, same as compliance reports)
- Versioned: each download is timestamped and stored for audit

**Sub-processor list with verified data residency**:
| Sub-processor | Purpose | Data Location | Notes |
|--------------|---------|---------------|-------|
| Neon | PostgreSQL database | EU (Frankfurt) | Verified EU region |
| Qdrant | Vector search | EU (AWS Frankfurt) | Verified EU region |
| Azure Blob Storage | Recording storage | EU West | Verified EU region |
| Recall.ai | Meeting bot | EU Central (`eu-central-1.recall.ai`) | Verified EU endpoint |
| Deepgram | Transcription | **Verify**: request EU processing confirmation | US company — must confirm EU data processing option |
| Anthropic (Claude) | AI summarization | **Verify**: no EU data center as of March 2026 | May process in US — disclose transparently |
| Resend | Email delivery | **Verify**: check data processing location | US company — confirm processing details |

> **Action required before shipping**: Contact Deepgram, Anthropic, and Resend to confirm data processing locations. If any process data outside EU, disclose this transparently in the DPA rather than claiming "EU-only." Honesty builds more trust with gov buyers than a false claim that could be audited.

**Why this matters**: Every Dutch gov contract requires a signed verwerkersovereenkomst. Self-serve generation removes weeks of legal back-and-forth from the sales cycle.

### 2.5 Dutch UI Localization (Weeks 6-7)

**Approach**: `next-intl` for i18n framework

**Architectural setup** (Week 6):

- Install `next-intl` and configure middleware for locale detection
- Add `[locale]` route group wrapper (or use `next-intl`'s App Router integration without route prefix — preferred for this case, using cookie/header-based locale)
- Set up message file structure: `messages/en.json`, `messages/nl.json`
- Configure server components to access translations
- Default to Dutch for Dutch browser locale, English as fallback

**Translation** (Week 7):

- Translate all UI strings. Use Claude Code for initial translation, then manual review for naturalness.
- Do NOT translate technical terms commonly used in English in Dutch workplaces (e.g., "dashboard", "recording", "transcript")
- Date/time formatting (Dutch locale)
- Focus on high-traffic pages first: dashboard, recordings, meetings, settings

**Quality bar**: Natural Dutch, not machine-translated. Gov users will notice awkward phrasing.

### 2.6 Dutch Language Quality (Week 7)

- Validate Deepgram Dutch transcription accuracy with test recordings
- Test: formal "u" speech, informal "je", mixed Dutch/English, Flemish accents, technical jargon
- Tune Claude prompts for Dutch summary output: natural phrasing, formal/informal toggle
- Test task extraction in Dutch: action items should read naturally ("Jan moet het rapport afronden voor vrijdag")

---

## Phase 3: Make It Sellable (Weeks 8-10)

**Exit criteria**: A prospect can go from discovering Inovy to using it and paying, with no manual intervention.

> **Note**: Shifted by 1 week due to Phase 2 extension.

### 3.1 Onboarding Redesign (Week 8)

**Target**: signup to first meeting summary in under 10 minutes.

**Flow**:

1. Sign up (email or Google/Microsoft OAuth)
2. Create organization (name, size)
3. Connect calendar (Google or Microsoft) — one-click OAuth
4. Enable bot (toggle on, set display name)
5. See upcoming meetings with toggle per meeting
6. Wait for next meeting OR upload a recording to try immediately
7. First summary arrives → user sees value

**First-run additions**:

- Empty state screens with clear CTAs at each section
- Pre-loaded demo recording with Dutch transcript + summary so users see value before first real meeting
- Brief tooltip tour of key features (3-4 steps max, dismissable)

### 3.2 Trial-to-Paid Conversion (Week 9)

**Email sequence** (via Resend):

- Day 1: Welcome + setup guide (triggered by signup)
- Day 3: "Your first summary is ready" (triggered by first completed recording — event hook in workflow)
- Day 7: Usage summary ("You recorded X meetings, extracted Y tasks this week")
- Day 10: "Trial ending soon" + feature highlights they haven't tried
- Day 13: "Last day" + upgrade CTA
- Day 14: Downgrade notification

**Email trigger implementation**:

- Add `trial_email_state` table: `org_id`, `last_sent_step` (day 1/3/7/10/13/14), `next_send_at`, `completed`
- Event-triggered emails (Day 3): add hook in `convertRecordingIntoAiInsights` workflow completion step — check if this is the org's first recording, if so queue the Day 3 email
- Time-triggered emails (Day 1/7/10/13/14): new daily cron job `process-trial-emails` that checks `trial_email_state` and sends due emails
- Keep on Vercel cron (daily frequency is fine for email sequence)

**In-app prompts**:

- Contextual upgrade prompts when hitting tier limits (not random nags)
- Trial days remaining badge in sidebar
- Pricing comparison modal from billing settings

**Feature gating implementation**:

- Middleware-level checks against org subscription state
- Read-only mode after trial expiry (preserve data, block new recordings)
- Seat limit enforcement (Starter: 5)
- Recording hour tracking and limit enforcement (Starter: 40 hrs/month)

### 3.3 Trust & Security Page (Week 10)

**Public route**: `/security` (no auth required)

**Content**:

- Data residency: EU infrastructure (Neon EU, Qdrant EU, Azure EU West). Transparently note which sub-processors may process data outside EU (based on verification from Section 2.4).
- Encryption: at rest (AES-256) + in transit (TLS 1.3)
- AVG compliance summary
- Sub-processor list with locations (same as DPA)
- Certifications: SOC 2 Type II (in progress, target Q4 2026)
- PII handling: automatic detection + redaction
- Audit logging: tamper-proof hash chain
- Incident response process
- Downloadable security whitepaper (PDF)

**Why this matters**: Dutch gov IT/security teams will check this page before approving a trial. It signals operational maturity and removes blockers from the procurement process.

**Additional trust items**:

- Update `/privacy-policy` and `/terms-of-service` for SaaS billing context
- Add Dutch-language versions of both
- Cookie consent banner (if not present)
- Simple status page (Instatus free tier or similar)

---

## Phase 4: Make It Reliable (Weeks 11-12)

**Exit criteria**: 1-3 paying customers (or committed trial-to-paid conversions) with monitoring in place, no critical unhandled errors for 7 consecutive days.

> **Note**: Compressed from 3 weeks to 2. Load testing moved to post-launch. Customer onboarding can begin as soon as Phase 3 exits.

### 4.1 Monitoring & Alerting (Week 11)

**Error tracking**: Sentry integration (client + server) via `@sentry/nextjs`

**Setup**:

- Install and configure `@sentry/nextjs` with Next.js 16 App Router
- Configure source maps upload for readable stack traces
- Set up 4 alert rules (not comprehensive — just the critical ones):
  1. Bot session failure rate > 10% in 1 hour
  2. Any Stripe webhook handler error
  3. Any cron job failure (Azure or Vercel)
  4. Unhandled exception rate spike
- Delivery: email alerts (add Slack webhook later)

**Billing monitoring**:

- Failed payments alert (Stripe webhook → Sentry)
- Simple admin MRR view (query Stripe API, display in `/admin` dashboard)

**Health checks**:

- Synthetic `/api/health` checks every 5 minutes (use free uptime monitor like UptimeRobot)
- Database connection pool monitoring via existing `/api/connection-pool/health`

### 4.2 Resilience & First Customers (Week 12)

**Graceful degradation**:

- Deepgram down → queue for retry, notify user "transcription delayed"
- Recall.ai down → clear error message, no silent failure
- Claude down → fallback to OpenAI (both providers installed)
- Stripe webhook missed → daily reconciliation job checks subscription state

**Data integrity spot-check**:

- Manually verify audit log hash chain integrity
- Test GDPR data export end-to-end (download ZIP, verify contents)
- Test user deletion request flow

**First customer onboarding**:

- Contact warm leads in Dutch gov / business network
- Offer 30-day extended trial for first 3 customers (feedback in exchange for early access)
- White-glove onboarding: personal setup call, help connect calendars, attend first recorded meeting together

**Feedback infrastructure**:

- In-app feedback widget: "How was this summary?" (thumbs up/down + optional comment)
- New `feedback` table: `id`, `org_id`, `user_id`, `recording_id`, `type` (summary/transcription/general), `rating` (up/down), `comment`, `created_at`
- Track: transcription quality, missing features, UX confusion

**Iteration reserve**: 50% of week 12 reserved for fixing issues surfaced by first customers.

---

## Out of Scope

These are explicitly NOT included in this 12-week plan:

| Feature                        | Rationale                                             | Revisit When                      |
| ------------------------------ | ----------------------------------------------------- | --------------------------------- |
| Slack/Teams integration        | Not a purchase driver for Dutch gov                   | 10+ customers request it          |
| CRM integration (HubSpot etc.) | Gov doesn't need CRM sync for meeting notes           | Expanding to sales verticals      |
| Chrome extension               | Bot + browser recording covers use cases              | After mobile app demand           |
| Mobile app                     | Gov workers meet on laptops                           | Q1 2027                           |
| Conversation analytics         | Nice-to-have, not purchase driver                     | Post-revenue phase 2              |
| Voice agents                   | Regulatory risk in EU                                 | 2027+                             |
| Public API                     | No third-party developers yet                         | 50+ customers                     |
| SOC 2 Type II                  | 6-12 month process, start paperwork week 8            | Target Q4 2026                    |
| SSO/SCIM                       | Enterprise tier, no enterprise customers yet          | First enterprise deal             |
| NIS2/DORA compliance           | Needs legal review                                    | Q3 2026                           |
| `generate_followup_agenda`     | Low priority vs email + tasks                         | After core post-actions validated |
| `push_external`                | Requires Slack integration first                      | After Slack integration           |
| Load testing                   | Defer to post-launch; first customers are small teams | After 10+ concurrent orgs         |

**Scope rule**: If a prospect asks for something on this list, promise it on the roadmap and close the deal on what exists. Exception: 3+ prospects independently block on the same feature.

---

## Technical Decisions

### Infrastructure

- **Vercel Pro**: upgrade from free tier ($20/month) for better function limits and sub-daily crons
- **Azure Functions**: Consumption plan, EU West region, for high-frequency crons
- **Terraform**: new `infra/terraform/` directory at monorepo root (greenfield — no existing Terraform config)

### New Dependencies

- `next-intl`: i18n framework for Dutch localization
- `@sentry/nextjs`: error tracking and performance monitoring
- `@react-pdf/renderer`: PDF generation for compliance reports and DPA
- No new SDKs for Slack/CRM/etc. (out of scope)

### Schema Changes

- `transcript_chunks`: real-time bot transcription chunks
- `works_council_approvals`: OR consent workflow
- `consent_participants`: add `works_council_approval` enum value + nullable FK
- Billing-related tables via `@better-auth/stripe` plugin (auto-generated)
- `trial_email_state`: trial email sequence tracking
- `feedback`: in-app feedback collection

### Existing Code Changes

- `src/lib/auth.ts`: register `@better-auth/stripe` plugin
- `src/server/services/post-action-executor.service.ts`: implement 3 of 5 executor methods
- `src/server/services/bot-webhook.service.ts`: add transcript event processing
- `src/workflows/convert-recording/steps/step-post-actions.ts`: verify wiring
- `src/emails/templates/`: new summary email template, leverage existing Stripe templates
- Middleware: add subscription tier checks
- Onboarding flow: redesign existing `/onboarding` route

### Testing Strategy

- **Unit tests** (Vitest): post-action executors, consent workflows, billing middleware, transcript chunk assembly, compliance data aggregation
- **Integration tests**: full recording-to-summary workflow, Stripe webhook handling, cron job execution
- **Manual E2E**: Week 3 validation (real meetings), Week 7 Dutch language quality
- **No dedicated E2E framework** (Playwright etc.) in this phase — manual testing is sufficient for the customer volume

---

## Success Metrics

| Metric                       | Target                   | Measured How                |
| ---------------------------- | ------------------------ | --------------------------- |
| Time to first summary        | < 10 minutes from signup | Onboarding funnel tracking  |
| Trial-to-paid conversion     | > 10%                    | Stripe + internal analytics |
| Paying customers (week 12)   | 1-3                      | Stripe dashboard            |
| Pipeline reliability         | > 95% success rate       | Sentry + bot session status |
| Dutch transcription accuracy | > 90% for clear audio    | Manual spot-checks          |
| Uptime                       | > 99.5%                  | Health check monitoring     |
| Critical errors              | 0 unhandled for 7 days   | Sentry                      |

---

## Risk Register

| Risk                                                      | Likelihood | Impact                               | Mitigation                                                                                              |
| --------------------------------------------------------- | ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Deepgram/Anthropic don't offer EU-only processing         | Medium     | High — undermines core positioning   | Disclose transparently; investigate EU alternatives (Azure OpenAI for EU, AssemblyAI for transcription) |
| `@better-auth/stripe` plugin has bugs or missing features | Medium     | Medium — blocks billing              | Fall back to direct Stripe SDK integration if plugin is unreliable                                      |
| Dutch i18n takes longer than 2 weeks                      | Medium     | Low — can ship English-first         | Ship with English UI + Dutch transcription/summaries; add Dutch UI post-launch                          |
| No warm leads convert to paying                           | Medium     | High — misses revenue target         | Start outreach in Week 8, not Week 12. Offer extended pilots.                                           |
| Recall.ai real-time transcription quality is poor         | Low        | Medium — fallback to Deepgram exists | Deepgram post-recording fallback is the safety net                                                      |
