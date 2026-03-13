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
