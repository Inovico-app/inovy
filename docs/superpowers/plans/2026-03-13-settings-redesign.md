# Settings Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all settings pages with sidebar navigation, overview dashboard, merged profile form, tabbed organization page, and consistent visual language.

**Architecture:** Sidebar layout with `next/dynamic` for bundle optimization. Server Components fetch data via `Promise.all`, pass to client components as slots. `nuqs` manages tab state via URL params. `ProtectedPage` lifted to layout for single auth boundary.

**Tech Stack:** Next.js 16 (App Router), React 19, Shadcn UI, Tailwind CSS 4, nuqs, react-hook-form, next-safe-action, neverthrow

**Spec:** `docs/superpowers/specs/2026-03-13-settings-redesign-design.md`

---

## Chunk 1: Foundation (Layout, Navigation, Config)

### Task 1: Shared nav items and config changes

**Files:**
- Create: `apps/web/src/features/settings/lib/settings-nav-items.ts`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Create shared nav items constant**

```typescript
// apps/web/src/features/settings/lib/settings-nav-items.ts
import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  Building2Icon,
  LayoutDashboardIcon,
  SettingsIcon,
  UserIcon,
  VideoIcon,
} from "lucide-react";

export interface SettingsNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    href: "/settings",
    icon: LayoutDashboardIcon,
    label: "Overview",
    description: "Settings overview and status",
  },
  {
    href: "/settings/profile",
    icon: UserIcon,
    label: "Profile",
    description: "Manage your personal account",
  },
  {
    href: "/settings/organization",
    icon: Building2Icon,
    label: "Organization",
    description: "View organization information",
  },
  {
    href: "/settings/agent",
    icon: BotIcon,
    label: "Agent",
    description: "Browse knowledge base documents",
  },
  {
    href: "/settings/bot",
    icon: VideoIcon,
    label: "Bot",
    description: "Configure meeting bot preferences",
  },
  {
    href: "/settings/integrations",
    icon: SettingsIcon,
    label: "Integrations",
    description: "Manage third-party connections",
  },
];
```

- [ ] **Step 2: Add redirect and optimizePackageImports to next.config.ts**

In `apps/web/next.config.ts`, add these two properties to the `nextConfig` object:

```typescript
// Add inside nextConfig object:
async redirects() {
  return [
    {
      source: "/settings/profile/edit",
      destination: "/settings/profile",
      permanent: true,
    },
  ];
},
// Add inside experimental:
experimental: {
  // ...existing experimental config
  optimizePackageImports: ["lucide-react"],
},
```

- [ ] **Step 3: Verify config compiles**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS (no type errors from config changes)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/settings/lib/settings-nav-items.ts apps/web/next.config.ts
git commit -m "feat(settings): add shared nav items and config optimizations"
```

---

### Task 2: Refine SettingsSidebar component

**Files:**
- Modify: `apps/web/src/features/settings/components/settings-sidebar.tsx`

- [ ] **Step 1: Rewrite SettingsSidebar to use shared nav items**

Replace the entire content of `apps/web/src/features/settings/components/settings-sidebar.tsx`:

```typescript
"use client";

import { SETTINGS_NAV_ITEMS } from "@/features/settings/lib/settings-nav-items";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/settings") return pathname === "/settings";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r bg-card/50 flex-shrink-0 hidden md:flex flex-col">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your preferences</p>
      </div>

      <nav className="flex-1 px-3 pb-6 space-y-0.5">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary border-l-2 border-primary -ml-px"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon
                className={`h-4 w-4 flex-shrink-0 ${
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${active ? "text-primary" : ""}`}>
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/settings/components/settings-sidebar.tsx
git commit -m "refactor(settings): rewrite sidebar with shared nav items and Linear-style active state"
```

---

### Task 3: Update SettingsNav for mobile

**Files:**
- Modify: `apps/web/src/features/settings/components/settings-nav.tsx`

- [ ] **Step 1: Rewrite SettingsNav to use shared nav items**

Replace the content of `apps/web/src/features/settings/components/settings-nav.tsx`:

```typescript
"use client";

import { HorizontalNav } from "@/components/horizontal-nav";
import { SETTINGS_NAV_ITEMS } from "@/features/settings/lib/settings-nav-items";

export function SettingsNav() {
  const items = SETTINGS_NAV_ITEMS.map((item) => ({
    href: item.href,
    icon: item.icon,
    label: item.label,
  }));

  return (
    <div className="md:hidden">
      <HorizontalNav items={items} ariaLabel="Settings navigation" />
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/settings/components/settings-nav.tsx
git commit -m "refactor(settings): update mobile nav to use shared nav items with Overview"
```

---

### Task 4: Create PageHeader component

**Files:**
- Create: `apps/web/src/components/page-header.tsx`

- [ ] **Step 1: Create shared PageHeader component**

```typescript
// apps/web/src/components/page-header.tsx
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/page-header.tsx
git commit -m "feat: add shared PageHeader component for consistent page titles"
```

---

### Task 5: Rewrite settings layout

**Files:**
- Modify: `apps/web/src/app/(main)/settings/layout.tsx`

- [ ] **Step 1: Rewrite layout with sidebar + content area pattern**

Replace `apps/web/src/app/(main)/settings/layout.tsx`:

```typescript
import { ProtectedPage } from "@/components/protected-page";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";

const SettingsSidebar = dynamic(
  () =>
    import("@/features/settings/components/settings-sidebar").then(
      (m) => m.SettingsSidebar
    ),
  { ssr: false }
);

interface SettingsLayoutProps {
  children: ReactNode;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  return (
    <ProtectedPage>
      <div className="flex h-full min-h-0">
        <Suspense>
          <SettingsSidebar />
        </Suspense>
        <div className="flex flex-col flex-1 min-w-0">
          <Suspense>
            <SettingsNav />
          </Suspense>
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <div className="max-w-3xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedPage>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 3: Start dev server and verify layout renders**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm dev:web`
Navigate to `http://localhost:3000/settings` and verify:
- Desktop: sidebar visible on left, content on right
- Mobile (resize to narrow): horizontal tabs visible, no sidebar

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(main)/settings/layout.tsx
git commit -m "feat(settings): rewrite layout with sidebar + content area and ProtectedPage"
```

---

## Chunk 2: Google Connection Cache + Overview Dashboard

### Task 6: Create Google connection cache helper

**Files:**
- Create: `apps/web/src/server/cache/google-connection.cache.ts`
- Modify: `apps/web/src/lib/cache-utils.ts` (add cache tag if needed)

- [ ] **Step 1: Add googleConnection to CacheTags**

Read `apps/web/src/lib/cache-utils.ts` and add a `googleConnection` method to the `CacheTags` object following the existing pattern:

```typescript
googleConnection: (userId: string) => `google-connection-${userId}`,
```

- [ ] **Step 2: Create google-connection.cache.ts**

```typescript
// apps/web/src/server/cache/google-connection.cache.ts
import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { cacheTag } from "next/cache";

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
}

async function getCachedGoogleConnectionStatusInternal(
  userId: string
): Promise<GoogleConnectionStatus> {
  "use cache";
  cacheTag(CacheTags.googleConnection(userId));

  const result = await GoogleOAuthService.getConnectionStatus(userId);

  if (result.isErr()) {
    logger.warn("Failed to fetch Google connection status", {
      userId,
      error: result.error,
    });
    return { connected: false };
  }

  return {
    connected: result.value.connected,
    email: result.value.email,
  };
}

export async function getCachedGoogleConnectionStatus(
  userId: string
): Promise<GoogleConnectionStatus> {
  return getCachedGoogleConnectionStatusInternal(userId);
}
```

- [ ] **Step 3: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/server/cache/google-connection.cache.ts
git commit -m "feat(settings): add server-side Google connection status cache helper"
```

---

### Task 7: Rewrite Overview Dashboard page

**Files:**
- Modify: `apps/web/src/app/(main)/settings/page.tsx`
- Create: `apps/web/src/features/settings/components/overview-action-items.tsx`

- [ ] **Step 1: Create overview-action-items.tsx**

```typescript
// apps/web/src/features/settings/components/overview-action-items.tsx
import type { ReactNode } from "react";
import type { PendingInvitationDto } from "@/server/services/organization.service";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2Icon, MailIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

interface ActionItem {
  id: string;
  label: string;
  description: string;
  href: Route;
  icon: ReactNode;
  badge?: string;
}

interface OverviewActionItemsProps {
  pendingInvitations: PendingInvitationDto[];
  googleConnected: boolean;
  botEnabled: boolean;
}

export function OverviewActionItems({
  pendingInvitations,
  googleConnected,
  botEnabled,
}: OverviewActionItemsProps) {
  const actionItems: ActionItem[] = [];

  if (pendingInvitations.length > 0) {
    actionItems.push({
      id: "pending-invitations",
      label: `${pendingInvitations.length} pending invitation${pendingInvitations.length > 1 ? "s" : ""}`,
      description: `Awaiting response from ${pendingInvitations.map((i) => i.email).join(", ")}`,
      href: "/settings/organization?tab=members" as Route,
      icon: <MailIcon className="h-4 w-4 text-amber-500" />,
      badge: "Pending",
    });
  }

  if (!googleConnected) {
    actionItems.push({
      id: "connect-google",
      label: "Connect Google Workspace",
      description: "Enable calendar sync, email integration, and Drive monitoring",
      href: "/settings/integrations" as Route,
      icon: <LinkIcon className="h-4 w-4 text-muted-foreground" />,
    });
  }

  if (!botEnabled) {
    actionItems.push({
      id: "enable-bot",
      label: "Configure meeting bot",
      description: "Set up automatic meeting recording and transcription",
      href: "/settings/bot" as Route,
      icon: <LinkIcon className="h-4 w-4 text-muted-foreground" />,
    });
  }

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <CheckCircle2Icon className="h-5 w-5 text-green-500" />
          <p className="text-sm text-muted-foreground">
            You&apos;re all set — nothing needs your attention right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            {item.icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium group-hover:text-primary transition-colors">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.description}
              </p>
            </div>
            {item.badge && (
              <Badge
                variant="outline"
                className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400"
              >
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Rewrite the overview dashboard page**

Replace `apps/web/src/app/(main)/settings/page.tsx`:

```typescript
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { OverviewActionItems } from "@/features/settings/components/overview-action-items";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  getCachedKnowledgeDocuments,
} from "@/server/cache/knowledge-base.cache";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { getCachedGoogleConnectionStatus } from "@/server/cache/google-connection.cache";
import {
  OrganizationService,
} from "@/server/services/organization.service";
import {
  BotIcon,
  BookOpenIcon,
  LinkIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Suspense, type ReactNode } from "react";

function StatusDot({ status }: { status: "active" | "pending" | "inactive" }) {
  const colors = {
    active: "bg-green-500",
    pending: "bg-amber-500",
    inactive: "bg-muted-foreground/40",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[status]}`}
      aria-label={status}
    />
  );
}

async function OverviewContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.user || !authResult.value.organization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load settings overview</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;
  const organizationId = organization.id;

  const [membersResult, invitationsResult, botSettings, knowledgeDocs, googleStatus] =
    await Promise.all([
      OrganizationService.getOrganizationMembers(organizationId),
      OrganizationService.getPendingInvitations(organizationId),
      getCachedBotSettings(user.id, organizationId),
      getCachedKnowledgeDocuments("organization", organizationId),
      getCachedGoogleConnectionStatus(user.id),
    ]);

  const members = membersResult.isOk() ? membersResult.value : [];
  const invitations = invitationsResult.isOk() ? invitationsResult.value : [];
  const botEnabled = botSettings.isOk() ? botSettings.value.botEnabled : false;
  const docCount = knowledgeDocs?.length ?? 0;

  const statusCards: Array<{
    label: string;
    value: string;
    status: "active" | "pending" | "inactive";
    icon: ReactNode;
    href: Route;
  }> = [
    {
      label: "Members",
      value: `${members.length} member${members.length !== 1 ? "s" : ""}${invitations.length > 0 ? ` · ${invitations.length} pending` : ""}`,
      status: invitations.length > 0 ? "pending" : "active",
      icon: <UsersIcon className="h-4 w-4 text-muted-foreground" />,
      href: "/settings/organization?tab=members" as Route,
    },
    {
      label: "Google",
      value: googleStatus.connected ? "Connected" : "Not connected",
      status: googleStatus.connected ? "active" : "inactive",
      icon: <LinkIcon className="h-4 w-4 text-muted-foreground" />,
      href: "/settings/integrations" as Route,
    },
    {
      label: "Bot",
      value: botEnabled ? "Enabled" : "Disabled",
      status: botEnabled ? "active" : "inactive",
      icon: <BotIcon className="h-4 w-4 text-muted-foreground" />,
      href: "/settings/bot" as Route,
    },
    {
      label: "Knowledge Base",
      value: `${docCount} document${docCount !== 1 ? "s" : ""}`,
      status: docCount > 0 ? "active" : "inactive",
      icon: <BookOpenIcon className="h-4 w-4 text-muted-foreground" />,
      href: "/settings/agent" as Route,
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Overview of your workspace configuration"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {statusCards.map((card) => (
          <Link key={card.label} href={card.href} className="group">
            <Card className="transition-colors hover:border-border/80" size="sm">
              <CardHeader className="flex-row items-center gap-3 pb-1">
                {card.icon}
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <StatusDot status={card.status} />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <OverviewActionItems
        pendingInvitations={invitations}
        googleConnected={googleStatus.connected}
        botEnabled={botEnabled}
      />
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 4: Verify in browser**

Navigate to `http://localhost:3000/settings` and verify:
- 4 status cards in a 2x2 grid
- Action items section below cards
- Cards are clickable and navigate to correct pages

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(main)/settings/page.tsx apps/web/src/features/settings/components/overview-action-items.tsx
git commit -m "feat(settings): redesign overview dashboard with status cards and action items"
```

---

## Chunk 3: Profile Page Redesign

### Task 8: Create ProfileForm client component

**Files:**
- Create: `apps/web/src/features/settings/components/profile-form.tsx`

- [ ] **Step 1: Create the always-editable profile form**

```typescript
// apps/web/src/features/settings/components/profile-form.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/settings/actions/update-profile";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/settings/validation/profile.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface ProfileFormProps {
  initialGivenName: string;
  initialFamilyName: string;
  email: string;
}

export function ProfileForm({
  initialGivenName,
  initialFamilyName,
  email,
}: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileFormSchema),
    defaultValues: {
      givenName: initialGivenName,
      familyName: initialFamilyName,
    },
  });

  const { execute, isExecuting } = useAction(updateProfile, {
    onSuccess: () => {
      toast.success("Profile updated successfully");
      form.reset(form.getValues());
    },
    onError: ({ error }) => {
      const message = error.serverError || "Failed to update profile";
      toast.error(message);
    },
  });

  function onSubmit(values: ProfileFormValues) {
    execute({
      given_name: values.givenName ?? "",
      family_name: values.familyName ?? "",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="givenName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your first name"
                      disabled={isExecuting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="familyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your last name"
                      disabled={isExecuting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Email</FormLabel>
              <Input value={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here
              </p>
            </FormItem>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isExecuting || !form.formState.isDirty}
              >
                {isExecuting && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/settings/components/profile-form.tsx
git commit -m "feat(settings): create always-editable ProfileForm client component"
```

---

### Task 9: Rewrite Profile page

**Files:**
- Modify: `apps/web/src/app/(main)/settings/profile/page.tsx`
- Delete: `apps/web/src/app/(main)/settings/profile/edit/page.tsx`

- [ ] **Step 1: Rewrite profile/page.tsx**

Replace `apps/web/src/app/(main)/settings/profile/page.tsx`:

```typescript
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { AutoProcessToggle } from "@/features/recordings/components/auto-process-toggle";
import { DataDeletion } from "@/features/settings/components/data-deletion";
import { DataExport } from "@/features/settings/components/data-export";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { getDeletionStatus } from "@/features/settings/lib/get-deletion-status";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  getCachedTeamsByOrganization,
  getCachedUserTeams,
} from "@/server/cache/team.cache";
import { UserService } from "@/server/services/user.service";
import { Building2Icon, UsersIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";

async function ProfileContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.user) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load profile information</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;
  const organizationId = organization?.id;
  const orgName = organization?.name ?? "Personal Organization";

  const [userDetailResult, userTeams, allTeams, deletionStatus] =
    await Promise.all([
      UserService.getUserById(user.id),
      organizationId
        ? getCachedUserTeams(user.id, organizationId)
        : Promise.resolve([]),
      organizationId
        ? getCachedTeamsByOrganization(organizationId)
        : Promise.resolve([]),
      getDeletionStatus(),
    ]);

  const givenName = userDetailResult.isOk()
    ? userDetailResult.value.given_name ?? ""
    : "";
  const familyName = userDetailResult.isOk()
    ? userDetailResult.value.family_name ?? ""
    : "";

  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your personal account information"
      />

      <ProfileForm
        initialGivenName={givenName}
        initialFamilyName={familyName}
        email={user.email || ""}
      />

      {/* Organization (display-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Building2Icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{orgName}</p>
              <p className="text-xs text-muted-foreground">
                {allTeams.length} team{allTeams.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {userTeams.length > 0 && (
            <div className="flex items-start gap-3">
              <UsersIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-1.5">
                {userTeams.map((userTeam) => {
                  const team = teamMap.get(userTeam.teamId);
                  if (!team) return null;
                  return (
                    <Badge key={userTeam.teamId} variant="outline" className="text-xs">
                      {team.name}
                      {userTeam.role !== "member" && (
                        <span className="ml-1 text-muted-foreground">
                          ({userTeam.role})
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Link
            href={"/settings/organization" as Route}
            className="text-xs text-primary hover:underline"
          >
            Manage organization settings
          </Link>
        </CardContent>
      </Card>

      {/* Preferences */}
      <AutoProcessToggle />

      {/* Data & Privacy */}
      <DataExport />

      <div className="border-l-2 border-destructive pl-4">
        <DataDeletion initialDeletionRequest={deletionStatus} />
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-64 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Delete the edit page**

Delete `apps/web/src/app/(main)/settings/profile/edit/page.tsx` (redirect is handled in `next.config.ts`).

- [ ] **Step 3: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 4: Verify in browser**

Navigate to `http://localhost:3000/settings/profile` and verify:
- First/Last Name fields are editable with pre-populated values
- Email is read-only
- Save button is disabled until form is dirty
- Organization card shows org info and team badges
- Data & Privacy section at bottom with destructive accent

Navigate to `http://localhost:3000/settings/profile/edit` and verify:
- Redirects to `/settings/profile`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(main)/settings/profile/page.tsx
git rm apps/web/src/app/(main)/settings/profile/edit/page.tsx
git commit -m "feat(settings): merge profile view/edit into single editable form"
```

---

## Chunk 4: Organization Page Redesign

### Task 10: Create OrganizationTabs client component

**Files:**
- Create: `apps/web/src/features/settings/components/organization-tabs.tsx`

- [ ] **Step 1: Create OrganizationTabs with nuqs tab state**

```typescript
// apps/web/src/features/settings/components/organization-tabs.tsx
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";

interface OrganizationTabsProps {
  generalContent: ReactNode;
  membersContent: ReactNode;
  aiContent: ReactNode;
}

export function OrganizationTabs({
  generalContent,
  membersContent,
  aiContent,
}: OrganizationTabsProps) {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: "general",
    shallow: false,
  });

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as string)}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="members">Members & Teams</TabsTrigger>
        <TabsTrigger value="ai">AI & Knowledge Base</TabsTrigger>
      </TabsList>

      <div className="mt-6">
        {tab === "general" && generalContent}
        {tab === "members" && membersContent}
        {tab === "ai" && aiContent}
      </div>
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/settings/components/organization-tabs.tsx
git commit -m "feat(settings): create OrganizationTabs client component with nuqs state"
```

---

### Task 11: Rewrite Organization page

**Files:**
- Modify: `apps/web/src/app/(main)/settings/organization/page.tsx`

- [ ] **Step 1: Rewrite organization/page.tsx with tabs and parallel fetches**

Replace `apps/web/src/app/(main)/settings/organization/page.tsx`:

```typescript
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { InviteUserDialog } from "@/features/admin/components/organization/invite-user-dialog";
import { TeamManagement } from "@/features/admin/components/team/team-management";
import { OrganizationKnowledgeBaseSection } from "@/features/knowledge-base/components/organization-knowledge-base-section";
import { getOrganizationSettings } from "@/features/settings/actions/organization-settings";
import { OrganizationInstructionsSection } from "@/features/settings/components/organization-instructions-section";
import { OrganizationTabs } from "@/features/settings/components/organization-tabs";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { formatDateShort } from "@/lib/formatters/date-formatters";
import { getUserDisplayName } from "@/lib/formatters/display-formatters";
import { logger } from "@/lib/logger";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import {
  getCachedKnowledgeDocuments,
  getCachedKnowledgeEntries,
} from "@/server/cache/knowledge-base.cache";
import {
  OrganizationService,
  type PendingInvitationDto,
} from "@/server/services/organization.service";
import {
  Building2Icon,
  ClockIcon,
  MailIcon,
  UsersIcon,
} from "lucide-react";
import { Suspense } from "react";

async function OrganizationContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr()) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load organization information</p>
      </div>
    );
  }

  const auth = authResult.value;
  const organization = auth.organization;

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No organization data available</p>
      </div>
    );
  }

  const organizationId = organization.id;
  const orgName = organization.name ?? "Organization";
  const canEdit = auth.user ? isOrganizationAdmin(auth.user) : false;

  // Parallel data fetching
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
      getCachedKnowledgeEntries("organization", organizationId).catch((error) => {
        logger.error("Failed to fetch knowledge entries", {
          component: "OrganizationPage",
          organizationId,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        return [];
      }),
      getCachedKnowledgeDocuments("organization", organizationId).catch((error) => {
        logger.error("Failed to fetch knowledge documents", {
          component: "OrganizationPage",
          organizationId,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        return [];
      }),
    ]),
  ]);

  const members = membersResult.isOk() ? membersResult.value : [];
  const pendingInvitations = invitationsResult.isOk() ? invitationsResult.value : [];
  const instructions =
    settingsResult && settingsResult.data?.instructions
      ? settingsResult.data.instructions
      : "";

  // Tab content: General
  const generalContent = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Organization Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Building2Icon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Organization Name</p>
            <p className="text-sm font-medium">{orgName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Members</p>
            <p className="text-sm font-medium">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Tab content: Members & Teams
  const membersContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Members</CardTitle>
            {canEdit && <InviteUserDialog />}
          </div>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {getUserDisplayName({
                          email: member.email,
                          given_name: member.given_name,
                          family_name: member.family_name,
                        })}
                      </p>
                      {member.roles && member.roles.length > 0 && (
                        <div className="flex gap-1">
                          {member.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {member.email && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <MailIcon className="h-3 w-3" />
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No members to display
            </p>
          )}

          {pendingInvitations.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Pending Invitations ({pendingInvitations.length})
              </p>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-muted/25"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          {invitation.email}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400"
                        >
                          Pending
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {invitation.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <ClockIcon className="h-3 w-3" />
                        Expires {formatDateShort(invitation.expiresAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TeamManagement />
    </div>
  );

  // Tab content: AI & Knowledge Base
  const aiContent = (
    <div className="space-y-6">
      <OrganizationInstructionsSection
        initialInstructions={instructions}
        organizationId={organizationId}
        canEdit={canEdit}
      />
      <OrganizationKnowledgeBaseSection
        canEdit
        initialEntries={knowledgeEntries}
        initialDocuments={knowledgeDocuments}
        organizationId={organizationId}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Organization"
        description="Manage your organization settings and members"
      />
      <Suspense>
        <OrganizationTabs
          generalContent={generalContent}
          membersContent={membersContent}
          aiContent={aiContent}
        />
      </Suspense>
    </>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <OrganizationContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/settings/organization` and verify:
- 3 tabs visible: General, Members & Teams, AI & Knowledge Base
- Tab switching works and updates URL (?tab=members, etc.)
- Back button works with tab state
- Members list renders correctly
- AI instructions and knowledge base render in their tab

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(main)/settings/organization/page.tsx
git commit -m "feat(settings): redesign organization page with tabbed layout and parallel fetches"
```

---

## Chunk 5: Bot, Agent, Integrations Page Updates

### Task 12: Update Bot page

**Files:**
- Modify: `apps/web/src/app/(main)/settings/bot/page.tsx`

- [ ] **Step 1: Rewrite bot page — remove wrappers, use PageHeader**

Replace `apps/web/src/app/(main)/settings/bot/page.tsx`:

```typescript
import { PageHeader } from "@/components/page-header";
import { BotSettingsContent } from "@/features/bot/components/bot-settings-content";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger, serializeError } from "@/lib/logger";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { Suspense } from "react";

async function BotSettingsContentWrapper() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.user) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load bot settings. Please try again.
        </p>
      </div>
    );
  }

  const { user, organization } = authResult.value;

  if (!organization) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Organization context required
        </p>
      </div>
    );
  }

  const settingsResult = await getCachedBotSettings(user.id, organization.id);

  if (settingsResult.isErr()) {
    logger.error("Failed to load bot settings", {
      userId: user.id,
      organizationId: organization.id,
      error: serializeError(settingsResult.error),
    });
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load bot settings. Please try again.
        </p>
      </div>
    );
  }

  return <BotSettingsContent initialSettings={settingsResult.value} />;
}

export default function BotSettingsPage() {
  return (
    <>
      <PageHeader
        title="Bot Settings"
        description="Configure your meeting bot preferences and manage recording consent"
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        }
      >
        <BotSettingsContentWrapper />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(main)/settings/bot/page.tsx
git commit -m "refactor(settings): update bot page to match new design language"
```

---

### Task 13: Update Agent page

**Files:**
- Modify: `apps/web/src/app/(main)/settings/agent/page.tsx`

- [ ] **Step 1: Read the current agent page to understand its structure**

Read `apps/web/src/app/(main)/settings/agent/page.tsx` and update it to:
- Remove `container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6` wrappers (layout provides padding)
- Replace the `h1` header with `<PageHeader>` component
- Keep all existing content and components as-is

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(main)/settings/agent/page.tsx
git commit -m "refactor(settings): update agent page to match new design language"
```

---

### Task 14: Update Integrations page

**Files:**
- Modify: `apps/web/src/app/(main)/settings/integrations/page.tsx`

- [ ] **Step 1: Rewrite integrations page — remove wrappers, use PageHeader**

Replace `apps/web/src/app/(main)/settings/integrations/page.tsx`:

```typescript
import { PageHeader } from "@/components/page-header";
import { DriveWatchSettings } from "@/features/settings/components/drive-watch-settings";
import { GoogleConnection } from "@/features/settings/components/google-connection";
import { GoogleSettings } from "@/features/settings/components/google-settings";
import { GoogleStatusDashboard } from "@/features/settings/components/google-status-dashboard";
import { Suspense } from "react";

function IntegrationsContent() {
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect and manage your third-party integrations"
      />
      <div className="space-y-6">
        <GoogleConnection />
        <GoogleSettings />
        <GoogleStatusDashboard />
        <DriveWatchSettings />
      </div>
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(main)/settings/integrations/page.tsx
git commit -m "refactor(settings): update integrations page to match new design language"
```

---

## Chunk 6: Verification and Cleanup

### Task 15: Full verification

- [ ] **Step 1: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run lint`
Expected: Warning count should not increase from baseline (~99 warnings)

- [ ] **Step 3: Run build**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web run build`
Expected: PASS

- [ ] **Step 4: Manual browser verification checklist**

Navigate through each page and verify:

| Route | Check |
|-------|-------|
| `/settings` | Overview dashboard with 4 status cards + action items |
| `/settings/profile` | Editable form with pre-populated name fields, disabled email |
| `/settings/profile/edit` | Redirects to `/settings/profile` |
| `/settings/organization` | 3 tabs (General, Members, AI) with URL state |
| `/settings/organization?tab=members` | Members list, pending invitations, teams |
| `/settings/organization?tab=ai` | AI instructions + knowledge base |
| `/settings/agent` | Agent page with consistent header |
| `/settings/bot` | Bot settings with consistent header |
| `/settings/integrations` | Integrations with consistent header |

Also verify:
- Desktop: sidebar visible with Overview item, active state shows left border
- Mobile (narrow viewport): horizontal tabs with Overview item, no sidebar
- Dark mode: no hardcoded color classes visible
- All links/navigation between pages work

- [ ] **Step 5: Run AI code review**

Run: `coderrabit --prompt-only -t uncommitted`

Fix any issues reported.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(settings): address code review feedback"
```
