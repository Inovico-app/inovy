import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

async function AdminDashboard() {
  const t = await getTranslations("admin.dashboard");
  // Check if user is authenticated and has admin permissions
  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/");
  }

  // Check admin permissions using type-safe helper
  const hasAdminPermission = await checkPermission(Permissions.admin.all);

  if (!hasAdminPermission) {
    redirect("/");
  }

  // Check if user has superadmin permissions to show Organizations
  const hasSuperAdminPermission = await checkPermission(
    Permissions.superadmin.all,
  );

  const baseQuickLinks = [
    {
      title: t("userManagement"),
      description: t("userManagementDescription"),
      href: "/admin/users",
    },
    {
      title: t("avgCompliance"),
      description: t("avgComplianceDescription"),
      href: "/admin/compliance",
    },
  ];

  const superAdminLinks = hasSuperAdminPermission
    ? [
        {
          title: t("organizations"),
          description: t("organizationsDescription"),
          href: "/admin/organizations",
        },
      ]
    : [];

  const quickLinks = [
    ...baseQuickLinks,
    ...superAdminLinks,
    {
      title: t("auditLogs"),
      description: t("auditLogsDescription"),
      href: "/admin/audit-logs",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="max-w-4xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href as Route} className="group">
              <Card className="transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {link.title}
                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("gettingStarted")}</CardTitle>
            <CardDescription>{t("gettingStartedDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <div>
                <p className="font-medium text-sm">{t("manageUsers")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("manageUsersDescription")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <div>
                <p className="font-medium text-sm">{t("monitorActivity")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("monitorActivityDescription")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <div>
                <p className="font-medium text-sm">{t("organizeTeams")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("organizeTeamsDescription")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="max-w-4xl">
            <div className="mb-10 space-y-4">
              <Skeleton className="h-9 w-64 animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-24 w-full animate-pulse" />
              <Skeleton className="h-24 w-full animate-pulse" />
            </div>
            <Card className="mt-6">
              <Skeleton className="h-12 w-full animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
            </Card>
          </div>
        </div>
      }
    >
      <AdminDashboard />;
    </Suspense>
  );
}
