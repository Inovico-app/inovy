# OWASP Agentic AI Security Hardening — Design Spec

## Context

Implement OWASP Top 10 for Agentic AI security improvements across 9 stacked PRs, ordered by risk priority.

## Current Architecture

- AI agent: GPT-5-nano via Vercel AI SDK, streaming responses
- Tools: searchKnowledge, listProjects, listRecordings, getRecordingDetails, listTasks
- Guardrails: 7-layer middleware (moderation, PII, injection, topic, PII output, output validation, audit)
- Auth: Better Auth with RBAC (superadmin, admin, manager, user, viewer)
- Rate limiting: Redis-based token bucket (free: 100/hr, pro: 1000/hr)
- Org isolation: `assertOrganizationAccess()` on all operations

---

## HIGH Priority

### PR 1: AAI001 — Agent Authorization & Kill Switches

**1a. Role-Based Tool Allowlist**
- New `AgentPermissionService` in `apps/web/src/server/services/agent-permission.service.ts`
- Define tool allowlists per role:
  - superadmin/admin: all tools
  - manager: all tools
  - user: searchKnowledge, listRecordings, getRecordingDetails, listTasks, listProjects
  - viewer: searchKnowledge, getRecordingDetails only
- Filter tools in `createChatTools()` before passing to model
- Return `Result<Tool[]>` so caller gets only permitted tools

**1b. Global + Org Kill Switch**
- `AGENT_GLOBAL_KILL_SWITCH` env var for instant global disable
- Check order: global kill switch → org-level enable → proceed
- New `AgentKillSwitchService` with Redis-backed runtime toggle
- Admin API endpoint `GET/POST /api/admin/agent/kill-switch` for superadmins
  - GET: returns current effective state
  - POST: toggles runtime switch, returns `{ requested, effective }` (effective accounts for env var override)
- Returns 503 "Agent temporarily unavailable" when active
- **Redis outage policy:** `AgentKillSwitchService.isKilled()` currently fails open (agents remain available) when Redis is unavailable, deferring to per-org config. The env var `AGENT_GLOBAL_KILL_SWITCH=true` always takes precedence regardless of Redis state. Redis failures are logged at error level for alerting.

**1c. Tool Execution Audit**
- Wrap tool executions with authorization check + audit entry
- Log: tool name, sanitized arguments, user role, org, allow/deny decision
- New `agent-authorization` audit event type in audit log service

### PR 2: AAI002 — Tool Sandboxing & Allowlists

**2a. Tool Execution Sandbox**
- New `ToolSandbox` wrapper around each tool's `execute` function
- Validates input against strict Zod schemas (already exists, ensure completeness)
- Validates output structure and size (max 50KB per tool response)
- Timeout per tool execution (5s default, configurable)

**2b. Tool Call Depth Limiting**
- Already exists: `stepCountIs(10)` limits to 10 tool steps
- Reduce to 5 steps for viewer role, keep 10 for others
- Add per-conversation tool call counter (persisted)
- Max 50 tool calls per conversation

**2c. Sensitive Data Filtering in Tool Output**
- Apply PII detection to tool outputs before returning to model
- Redact sensitive fields from database results (e.g., user emails in responses)

### PR 3: AAI005 — Circuit Breakers & Blast Radius

**3a. Circuit Breaker for Tool Execution**
- New `CircuitBreakerService` with states: closed → open → half-open
- Tracks failure rate per tool per org (Redis-backed)
- Thresholds: 5 failures in 1 minute → open circuit for 30s
- Half-open: allow 1 request, if success → close, if fail → re-open
- When open: tool returns graceful error, agent continues without it

**3b. Per-Request Action Budget**
- Max actions per request: 10 (existing stepCountIs)
- Max token budget per request: configurable via agent settings
- Track cumulative tokens across tool calls
- Abort streaming if budget exceeded

**3c. Anomaly Detection & Auto-Suspension**
- Track patterns: rapid tool calls, repeated failures, unusual tool combinations
- If anomaly score exceeds threshold → suspend agent for user/org for 5 minutes
- Log anomaly events for security review

### PR 4: AAI010 — Human-in-the-Loop Gates

**4a. Critical Action Definition**
- Define critical actions that could have side effects
- Currently all tools are read-only → low risk
- Create framework for future write-actions requiring approval
- `CriticalActionRegistry` with action classification (read/write/destructive)

**4b. Approval Workflow Infrastructure**
- New `ApprovalService` for queuing actions requiring human review
- Approval request stored in DB with timeout (5 min auto-deny)
- WebSocket/SSE notification to user for pending approvals
- Approve/deny UI component

**4c. Mandatory Review for Sensitive Queries**
- If query touches sensitive data categories (financial, medical, legal), flag for review
- Configurable per-org sensitivity thresholds

---

## MEDIUM Priority

### PR 5: AAI003 — System Prompt Integrity

- Hash system prompts at build time, verify at runtime
- Detect if system prompt was modified in transit
- Immutable prompt store with versioning

### PR 6: AAI004 — Output Grounding & Hallucination Checks

- Source citation verification (check RAG sources exist)
- Confidence scoring on responses
- "I don't know" detection for ungrounded claims

### PR 7: AAI006 — Conversation Context Integrity

- Hash chain for conversation messages (similar to audit log)
- Detect if conversation history was tampered with
- Context window bounds validation

---

## LOW Priority (Deferred)

### PR 8: AAI008 — Per-Agent Token Budgets
### PR 9: AAI009 — Model Provenance & SBOM
