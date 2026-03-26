import type { ReactNode } from "react";
import type { PendingInvitationDto } from "@/server/services/organization.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BotIcon, CheckCircle2Icon, LinkIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

export async function OverviewActionItems({
  pendingInvitations,
  googleConnected,
  botEnabled,
}: OverviewActionItemsProps) {
  const t = await getTranslations("settings.overview");
  const actionItems: ActionItem[] = [];

  if (pendingInvitations.length > 0) {
    actionItems.push({
      id: "pending-invitations",
      label: `${pendingInvitations.length} pending invitation${pendingInvitations.length > 1 ? "s" : ""}`,
      description: `Awaiting response from ${pendingInvitations
        .slice(0, 3)
        .map((i) => i.email)
        .join(
          ", ",
        )}${pendingInvitations.length > 3 ? ` +${pendingInvitations.length - 3} more` : ""}`,
      href: "/settings/organization?tab=members" as Route,
      icon: <MailIcon className="h-4 w-4 text-amber-500" />,
      badge: t("pending"),
    });
  }

  if (!googleConnected) {
    actionItems.push({
      id: "connect-google",
      label: t("connectGoogle"),
      description: t("connectGoogleDescription"),
      href: "/settings/integrations" as Route,
      icon: <LinkIcon className="h-4 w-4 text-muted-foreground" />,
    });
  }

  if (!botEnabled) {
    actionItems.push({
      id: "enable-bot",
      label: t("configureNotetaker"),
      description: t("configureNotetakerDescription"),
      href: "/settings/bot" as Route,
      icon: <BotIcon className="h-4 w-4 text-muted-foreground" />,
    });
  }

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <CheckCircle2Icon className="h-5 w-5 text-green-500" />
          <p className="text-sm text-muted-foreground">{t("allSet")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          {t("needsAttention")}
        </CardTitle>
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
