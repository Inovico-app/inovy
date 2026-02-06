import { BotSessionsList } from "@/features/bot/components/bot-sessions-list";
import { BotSessionsTabs } from "@/features/bot/components/bot-sessions-tabs";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedBotSessions } from "@/server/cache/bot-sessions.cache";
import type { BotStatus } from "@/server/db/schema/bot-sessions";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const ACTIVE_STATUSES: BotStatus[] = [
  "scheduled",
  "joining",
  "active",
  "leaving",
  "pending_consent",
];

function getStatusFilter(tab: string): BotStatus | BotStatus[] {
  if (tab === "completed") return "completed";
  if (tab === "failed") return "failed";
  return ACTIVE_STATUSES;
}

async function BotSessionsContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/sign-in");
  }

  const { organization } = authResult.value;

  if (!organization) {
    redirect("/sign-in");
  }

  const { tab = "active" } = await searchParams;
  const statusFilter = getStatusFilter(tab);

  // Fetch sessions for tab counts and current tab in parallel
  const [
    activeSessions,
    completedSessions,
    failedSessions,
    currentTabSessions,
  ] = await Promise.all([
    getCachedBotSessions(organization.id, {
      status: ACTIVE_STATUSES,
      limit: 1, // Only need count
    }),
    getCachedBotSessions(organization.id, {
      status: "completed",
      limit: 1, // Only need count
    }),
    getCachedBotSessions(organization.id, {
      status: "failed",
      limit: 1, // Only need count
    }),
    getCachedBotSessions(organization.id, {
      status: statusFilter,
      limit: 20,
    }),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Bot Sessions</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your bot recording sessions
          </p>
        </div>

        <div className="mb-6">
          <BotSessionsTabs
            activeCount={activeSessions.total}
            completedCount={completedSessions.total}
            failedCount={failedSessions.total}
          />
        </div>

        <BotSessionsList
          initialSessions={currentTabSessions.sessions}
          status={statusFilter}
          hasMore={currentTabSessions.hasMore}
        />
      </div>
    </div>
  );
}

export default function BotSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="container mx-auto py-8 px-4"
          aria-busy="true"
          aria-label="Loading sessions"
          role="status"
        >
          <div className="max-w-6xl mx-auto space-y-6">
            <div
              className="h-12 bg-muted rounded animate-pulse"
              aria-hidden="true"
            />
            <div
              className="h-12 bg-muted rounded animate-pulse"
              aria-hidden="true"
            />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-muted rounded animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <BotSessionsContent searchParams={searchParams} />
    </Suspense>
  );
}

