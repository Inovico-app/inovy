# Settings Pages Redesign — Design Spec

## Overview

Redesign all settings pages (`/settings/*`) for better UX, visual consistency, and information architecture. Replace the current stacked-cards-with-horizontal-tabs pattern with a sidebar-driven layout, tabbed sub-sections, and a cohesive design language.

## Current Problems

- **Redundant dashboard**: `/settings` shows quick-link cards that duplicate the navigation tabs
- **Organization page is a wall**: Org details, AI instructions, knowledge base, teams, members, and invitations all stacked vertically with no grouping
- **Profile splits view/edit unnecessarily**: Read-only display + separate `/settings/profile/edit` page adds friction
- **Inconsistent containers**: Some pages use `max-w-4xl` inside `max-w-6xl`, others don't
- **No visual identity**: Every page is the same: title, description, stacked cards with colored icon badges

## Design Decisions

### 1. Layout & Navigation

**Desktop (md+):** Horizontal flex layout — fixed sidebar (w-64) on the left, scrollable content area on the right.

**Mobile (<md):** Sidebar loaded via `next/dynamic` with `ssr: false` and hidden via CSS (`hidden md:flex`). Mobile nav (`SettingsNav`) shown via `md:hidden`. Using `next/dynamic` for the sidebar avoids shipping its JS to mobile clients where it's never visible, reducing bundle size per `bundle-dynamic-imports` (Vercel, CRITICAL).

**Shared nav items:** Extract a single `SETTINGS_NAV_ITEMS` constant into `apps/web/src/features/settings/lib/settings-nav-items.ts` that both `SettingsSidebar` and `SettingsNav` import. This eliminates the current duplication of menu item arrays across the two components.

**Sidebar:**
- Refine existing `SettingsSidebar` component (currently `w-72`, change to `w-64`)
- Remove chevron arrows (no sub-pages to imply)
- Add "Overview" item at top linking to `/settings`
- Active state: left border accent + background tint (Linear-style)

**Mobile nav (`SettingsNav`):**
- Add "Overview" item to match sidebar items, so mobile and desktop navigation are consistent

**Layout file:** `layout.tsx` changes from vertical stack to horizontal flex with responsive breakpoint. **The layout must remain an async Server Component** — never add `'use client'` to it. `ProtectedPage` is rendered directly in the layout (outside any `<Suspense>` boundary) so auth redirects fire before any content streams. Both `SettingsSidebar` and `SettingsNav` are wrapped in their own `<Suspense>` boundaries for consistency.

**Authentication boundary:** `ProtectedPage` is lifted into the layout, wrapping the entire sidebar + content area. Individual pages must remove their own `ProtectedPage` wrappers. Since `ProtectedPage` is an async Server Component that calls `getBetterAuthSession()` and `redirect()`, it must be placed **outside** any Suspense boundary in the layout tree.

### 2. Settings Overview Dashboard (`/settings`)

Replace quick-links grid + "Getting Started" tips with:

**Status Summary Row:** 4 compact clickable cards showing key metrics. Compose directly from the existing `Card` compound component (`Card`, `CardHeader`, `CardContent` with `size="sm"`) wrapped in a `Link` — no new `overview-status-card.tsx` file needed, as this would be a single-use abstraction. Add a small `StatusDot` component (just the colored dot) in `components/ui/` if needed.

Data sources — all fetched in a single `Promise.all` after session resolution (per `async-parallel`, Vercel CRITICAL):
```typescript
const auth = await getBetterAuthSession();
const [members, invitations, botSettings, knowledgeDocs, googleStatus] = await Promise.all([
  OrganizationService.getOrganizationMembers(organizationId),
  OrganizationService.getPendingInvitations(organizationId),
  getCachedBotSettings(userId, organizationId),
  getCachedKnowledgeDocuments("organization", organizationId),
  getCachedGoogleConnectionStatus(userId),  // new helper, see below
]);
```

- Members: count + pending invitations
- Google: connection status — create a new `getCachedGoogleConnectionStatus` server-side cache helper in `apps/web/src/server/cache/google-connection.cache.ts`. It should query whether the user has a valid Google OAuth token via `GoogleOAuthService.getConnectionStatus(userId)` (which wraps `OAuthConnectionsQueries.getOAuthConnection(userId, "google")`). This avoids a client-side fetch that would cause layout shift on the overview dashboard. Wrap with `"use cache"` or `React.cache()` following the existing cache helper pattern.
- Bot: enabled/disabled status — from `getCachedBotSettings`
- Knowledge Base: document count — from `getCachedKnowledgeDocuments`

Each card has a status indicator (green/amber/gray dot). Clicking navigates to the relevant settings page.

**Action Items Section:** Below status cards, a list of items needing attention:
- Pending invitations
- Incomplete setup steps (e.g. "Connect Google Workspace" — derivable from `googleStatus`)
- Only renders when items exist; shows "You're all set" when empty

No "Getting Started" tips block.

### 3. Profile Page (`/settings/profile`)

Single always-editable form replacing the view + separate edit page:

**Personal Information card:**
- First Name and Last Name as separate editable inputs (matching the existing `profileFormSchema` which has `givenName` and `familyName` fields, and the `updateProfile` server action which accepts `given_name` / `family_name`)
- Email: read-only disabled input
- Save button enabled only when form is dirty

**Data flow for pre-population:** The parent server component (`profile/page.tsx`) fetches user data via `getBetterAuthSession()`. To get split `given_name`/`family_name`, use `UserService.getUserById(user.id)` which reconstructs split name fields from the stored flat `name` by splitting on whitespace (the database stores a single `name` column, not separate columns). Handle the `Result` return type before passing `given_name` and `family_name` as props to the client `profile-form.tsx` component. This eliminates the current localStorage workaround and the `useEffect` in the edit page.

Note: The `updateProfile` server action writes to the database via `UserService.updateUser`, which stores the updated `given_name`/`family_name` back to the flat `name` field. This ensures the server-side fetch returns current data, even for users who previously saved via the localStorage-based edit page.

**All independent profile fetches must be parallelized** (per `async-parallel`, Vercel CRITICAL):
```typescript
const auth = await getBetterAuthSession();
const [userDetail, userTeams, allTeams, deletionStatus] = await Promise.all([
  UserService.getUserById(auth.value.user.id),
  getCachedUserTeams(auth.value.user.id, organizationId),
  getCachedTeamsByOrganization(organizationId),
  getDeletionStatus(),
]);
```

**Organization card (display-only):**
- Org name, member count, team count
- User's teams with roles
- Links to `/settings/organization` for management

**Preferences card:**
- Auto-process recordings toggle

**Data & Privacy card:**
- Export data button
- Delete data button (destructive left-border accent)

**Route changes:**
- `/settings/profile/edit` redirect handled via `next.config.ts` `redirects()` configuration, not a server component. This is more efficient (handled at the routing/proxy layer before React rendering) and is the idiomatic Next.js approach for permanent backward-compat redirects. Remove the `edit/page.tsx` file entirely.

### 4. Organization Page (`/settings/organization`)

Tabbed layout with 3 tabs, state managed via `nuqs` URL search params (`?tab=general`):

**Tab: General**
- Organization Name as read-only display (not editable). The existing `updateOrganization` action requires superadmin `organizations:update` permission, not org admin `settings:update`. Creating a new org-admin-scoped action is out of scope for this redesign. If org name editing is needed later, a new `updateOrganizationName` server action should be created separately.
- Organization metadata (member count, creation date, etc.)

**Tab: Members & Teams**
- Members list with invite button (admin-only)
- Pending invitations section (conditional)
- TeamManagement component (reused as-is)

**Tab: AI & Knowledge Base**
- OrganizationInstructionsSection component (reused, but hardcoded color classes like `bg-purple-100 dark:bg-purple-900` in the parent page wrapper will be replaced with CSS variable-based alternatives during the page rewrite)
- OrganizationKnowledgeBaseSection component (reused)

**RSC composition pattern:** `organization-tabs.tsx` is a `'use client'` component that manages tab state via `nuqs`. It must **not** import any server-only components directly. Instead, the parent server component (`organization/page.tsx`) renders all three tab panels as server components and passes them to `OrganizationTabs` as named slot props (`generalContent`, `membersContent`, `aiContent` of type `ReactNode`). This follows the established RSC composition pattern — server components render content, client components control visibility. Follow the existing pattern in `project-tabs.tsx` and `bot-sessions-tabs.tsx` which use the same `nuqs` + `Tabs` approach.

**Suspense:** The parent `organization/page.tsx` must wrap `<OrganizationTabs>` in a `<Suspense>` boundary because `nuqs` internally uses `useSearchParams`, which requires a Suspense boundary on static routes to avoid CSR bailout. Each tab's content should also be wrapped in its own `<Suspense>` boundary to enable streaming — the active tab's content streams first while inactive tabs can load in the background.

**All data fetches must be parallelized** (per `async-parallel`, Vercel CRITICAL):
```typescript
const auth = await getBetterAuthSession();
const [
  [membersResult, invitationsResult],
  settingsResult,
  [knowledgeEntries, knowledgeDocuments],
] = await Promise.all([
  Promise.all([
    OrganizationService.getOrganizationMembers(organizationId),
    OrganizationService.getPendingInvitations(organizationId),
  ]),
  getOrganizationSettings(),
  Promise.all([
    getCachedKnowledgeEntries("organization", organizationId),
    getCachedKnowledgeDocuments("organization", organizationId),
  ]),
]);
```

### 5. Bot, Agent & Integrations Pages

Structural changes minimal — aligned to new design language:

**Bot (`/settings/bot`):**
- Remove outer container/max-width wrappers (layout handles this)
- Remove `ProtectedPage` wrapper (layout handles auth)
- Consistent page header pattern
- BotSettingsContent component reused as-is

**Agent (`/settings/agent`):**
- Remove outer container/max-width wrappers (layout handles this)
- Consistent page header pattern
- Existing agent/knowledge base components reused as-is

**Integrations (`/settings/integrations`):**
- Remove container wrappers
- Consistent page header pattern
- Component stack (GoogleConnection, GoogleSettings, GoogleStatusDashboard, DriveWatchSettings) reused as-is

### 6. Visual Design Language

**Typography:**
- Page titles: `text-2xl font-semibold tracking-tight`
- Page descriptions: `text-sm text-muted-foreground`
- Card titles: `text-base font-medium`
- Form labels: `text-sm font-medium`

**Spacing:**
- Content area padding: `p-6 md:p-8`
- Between sections: `space-y-6`
- Inside cards: `p-6`
- Content max-width: `max-w-3xl`

**Cards:**
- Clean borders, no shadows
- No colored icon badges — icons inline in muted foreground
- Subtle `hover:border-border/80` on interactive cards

**Status indicators:**
- Small colored dots (green/amber/gray) for connection states
- Badges reserved for roles and labels

**Destructive actions:**
- Grouped at bottom of relevant pages
- Left border accent in `destructive` color
- Confirmation dialogs required

**Dark mode:**
- All colors via CSS variables — no hardcoded color classes like `bg-purple-100 dark:bg-purple-900`
- This applies to all newly written and modified code. Reused sub-components (TeamManagement, BotSettingsContent, Google* components) are not modified in this scope, but any wrapper code or page-level styling around them must use CSS variables.

## Files to Modify

### Layout & Navigation
- `apps/web/src/app/(main)/settings/layout.tsx` — Sidebar + content area layout with responsive breakpoint, ProtectedPage wrapper (outside Suspense), layout must remain async Server Component
- `apps/web/src/features/settings/components/settings-sidebar.tsx` — Refine: import shared nav items, remove chevrons, change w-72 to w-64, update active state
- `apps/web/src/features/settings/components/settings-nav.tsx` — Import shared nav items, add Overview item for mobile
- `apps/web/next.config.ts` — Add `optimizePackageImports: ['lucide-react']` to experimental config, add redirect from `/settings/profile/edit` to `/settings/profile`

### New Shared Files
- `apps/web/src/features/settings/lib/settings-nav-items.ts` — Single source of truth for nav items array (used by both sidebar and mobile nav)
- `apps/web/src/server/cache/google-connection.cache.ts` — Server-side cached helper for Google OAuth connection status

### Pages
- `apps/web/src/app/(main)/settings/page.tsx` — Overview dashboard with status cards (composed from existing Card) + action items, all fetches via Promise.all
- `apps/web/src/app/(main)/settings/profile/page.tsx` — Always-editable form, merge view/edit, fetch split name fields via UserService, all fetches via Promise.all
- `apps/web/src/app/(main)/settings/profile/edit/page.tsx` — Delete entirely (redirect handled in next.config.ts)
- `apps/web/src/app/(main)/settings/organization/page.tsx` — Tabbed layout with nuqs, all fetches via Promise.all, Suspense around OrganizationTabs
- `apps/web/src/app/(main)/settings/agent/page.tsx` — Remove container wrappers, update header to match design language
- `apps/web/src/app/(main)/settings/bot/page.tsx` — Remove container wrappers, remove ProtectedPage, update header
- `apps/web/src/app/(main)/settings/integrations/page.tsx` — Remove container wrappers, update header

### New Components
- `apps/web/src/components/page-header.tsx` — Shared page title + description pattern (in `/components/` for app-wide reuse, not scoped to settings feature)
- `apps/web/src/features/settings/components/overview-action-items.tsx` — Pending actions list
- `apps/web/src/features/settings/components/profile-form.tsx` — Always-editable profile form, receives `initialGivenName` and `initialFamilyName` as props from parent RSC
- `apps/web/src/features/settings/components/organization-tabs.tsx` — Client component managing tab state via nuqs, receives tab content as `ReactNode` slot props from parent RSC (must not import server-only components)

### Files to Delete
- `apps/web/src/app/(main)/settings/profile/edit/page.tsx` — Redirect handled in next.config.ts

## Technical Notes

- Tab state via `nuqs` for URL persistence and deep-linking, following the existing pattern in `project-tabs.tsx` and `bot-sessions-tabs.tsx`
- `OrganizationTabs` receives tab panel content as `ReactNode` slot props from the parent RSC — no server-only imports inside the client component (RSC composition pattern)
- `OrganizationTabs` must be wrapped in `<Suspense>` because `nuqs` uses `useSearchParams` internally (required for static routes per Next.js docs)
- Existing sub-components (TeamManagement, OrganizationInstructionsSection, OrganizationKnowledgeBaseSection, BotSettingsContent, Google* components) are reused without modification
- Server Components preserved for data fetching; client boundaries only where needed (sidebar, tabs, forms)
- **All independent data fetches within a page must use `Promise.all`** — no sequential awaits for independent operations (per `async-parallel`, Vercel CRITICAL)
- `getBetterAuthSession()` is wrapped in `React.cache()` so redundant calls across layout and page are deduplicated within the same request
- Suspense boundaries updated to match new spacing
- Form validation via react-hook-form with standard-schema resolver (existing pattern)
- Server actions via next-safe-action (existing pattern)
- Profile form data pre-populated from server via props, not localStorage
- Layout handles authentication via ProtectedPage (outside Suspense) — individual pages do not wrap themselves
- Sidebar loaded via `next/dynamic` with `ssr: false`, hidden on mobile via CSS; mobile nav shown via CSS breakpoint
- Add `optimizePackageImports: ['lucide-react']` to `next.config.ts` to avoid barrel import cost (per `bundle-barrel-imports`, Vercel CRITICAL — lucide-react has 1,583 modules)
