# Security Hardening Backlog

Observations from the OWASP Agentic AI implementation pass (2026-03-11).

## High Impact

### 1. Moderation gap in unified chat route

**File:** `apps/web/src/app/api/chat/route.ts`

`moderateUserInput()` only runs when `context === "organization"`. The project context path skips moderation entirely, so project-scoped chat has no content filtering.

**Fix:** Run moderation for both contexts before streaming.

---

### 2. Conversation ownership not verified on GET

**File:** `apps/web/src/app/api/chat/[projectId]/route.ts` (GET handler)

The endpoint checks that the user has access to the *project* but does not verify the `conversationId` actually belongs to that project or user. An authenticated user could read another user's conversation history by guessing UUIDs.

**Fix:** Query the conversation record and assert it belongs to the requesting project + organization before returning messages.

---

### 3. `x-forwarded-for` trusted without validation

**Files:** All 3 chat route files

`request.headers.get("x-forwarded-for")` is used directly for audit logging. This header is trivially spoofable unless the reverse proxy strips and re-sets it. On Vercel this is handled, but if the app is ever deployed elsewhere the logs become unreliable.

**Fix:** Document the deployment assumption, or add a trusted-proxy validation layer that only accepts the header from known infrastructure.

---

## Medium Impact

### 4. No aggregate organization-level rate limit

**Files:** `apps/web/src/app/api/chat/[projectId]/route.ts`, `route.ts`

Rate limiting is per-user (100/1000 req/hour). An organization with 50 users effectively gets 50k req/hour with no aggregate cap. This could lead to unexpected cost spikes.

**Fix:** Add a secondary org-level rate limit (e.g. 5000 req/hour per org) checked alongside the user-level limit.

---

### 5. Inconsistent rate limit patterns

**Files:** `organization/route.ts` vs `[projectId]/route.ts` and `route.ts`

`organization/route.ts` uses the `withRateLimit` HOF wrapper while the other two routes use inline `checkRateLimit`. Inconsistency increases the chance of bugs when updating rate limit logic.

**Fix:** Standardize on one pattern across all chat endpoints.

---

### 6. No request body size limit

**Files:** All chat route files

`request.json()` is called before zod validation. A malicious request with an oversized body would be fully parsed into memory before the schema rejects it.

**Fix:** Add a `Content-Length` check or use a streaming JSON parser with a size cap before full parsing.

---

## Low Impact

### 7. Stale `.next/types` references

The deleted MCP server routes (`/api/mcp/[transport]`, `/api/.well-known/oauth-protected-resource`) still have type validator entries in `.next/`, causing persistent typecheck errors.

**Fix:** `rm -rf .next` and rebuild, or add these paths to `.gitignore` if not already.

---

### 8. Accumulated lint warnings (112 total)

~97 unused `error` catch variables across services. Not a direct security issue but indicates error handling that silently swallows context, making incident investigation harder.

**Fix:** Prefix unused catches with `_` or log them. Address in a dedicated cleanup PR.
