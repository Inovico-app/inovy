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
import { Suspense } from "react";

async function AdminDashboard() {
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
    Permissions.superadmin.all
  );

  const baseQuickLinks = [
    {
      title: "User Management",
      description: "View and manage organization members",
      href: "/admin/users",
    },
  ];

  const superAdminLinks = hasSuperAdminPermission
    ? [
        {
          title: "Organizations",
          description: "Manage all organizations in the system",
          href: "/admin/organizations",
        },
      ]
    : [];

  const quickLinks = [
    ...baseQuickLinks,
    ...superAdminLinks,
    {
      title: "Audit Logs",
      description: "Track user actions and system events",
      href: "/admin/audit-logs",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl py-12 px-6">
      <div className="max-w-4xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the admin panel. Select a section from the sidebar to get
            started.
          </p>
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
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Quick tips for managing your system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <div>
                <p className="font-medium text-sm">Manage Users</p>
                <p className="text-sm text-muted-foreground">
                  Add, edit, or remove users and assign roles to control access
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <div>
                <p className="font-medium text-sm">Monitor Activity</p>
                <p className="text-sm text-muted-foreground">
                  Review audit logs to track changes and ensure compliance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <div>
                <p className="font-medium text-sm">Organize Teams</p>
                <p className="text-sm text-muted-foreground">
                  Create and manage organizations to structure your workspace
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
        <div className="container mx-auto max-w-6xl py-12 px-6">
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

