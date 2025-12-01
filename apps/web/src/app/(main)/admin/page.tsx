import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  BarChart3Icon,
  Building2Icon,
  ChevronRightIcon,
  FileTextIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function AdminVerticalTabs() {
  const menuItems = [
    {
      href: "/admin/users",
      icon: UsersIcon,
      title: "User Management",
      description: "Manage roles, permissions, and user activity",
    },
    {
      href: "/admin/organizations",
      icon: Building2Icon,
      title: "Organizations",
      description: "View, create, and edit organizations",
    },
    {
      href: "/admin/audit-logs",
      icon: FileTextIcon,
      title: "Audit Logs",
      description: "Track user actions and system events",
    },
    {
      href: "#",
      icon: BarChart3Icon,
      title: "System Analytics",
      description: "View system-wide statistics",
      disabled: true,
      badge: "Coming Soon",
    },
    {
      href: "#",
      icon: SettingsIcon,
      title: "System Settings",
      description: "Configure system preferences",
      disabled: true,
      badge: "Coming Soon",
    },
  ];

  return (
    <div className="space-y-1">
      {menuItems.map((item) => (
        <Link
          key={item.title}
          href={item.disabled ? "#" : item.href}
          className={`group flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
            item.disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-muted/50"
          }`}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`mt-0.5 rounded-md p-1.5 ${
                item.disabled
                  ? "bg-muted"
                  : "bg-primary/10 group-hover:bg-primary/15 transition-colors"
              }`}
            >
              <item.icon
                className={`h-4 w-4 ${item.disabled ? "text-muted-foreground" : "text-primary"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{item.title}</p>
                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
          {!item.disabled && (
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          )}
        </Link>
      ))}
    </div>
  );
}

async function AdminContainer() {
  // Check if user is authenticated and has admin permissions
  const sessionResult = await getAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/");
  }

  // Check admin permissions using type-safe helper
  const hasAdminPermission = await checkPermission(
    Permissions.organization.read
  );

  if (!hasAdminPermission) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, organizations, and system settings
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <AdminVerticalTabs />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-3xl py-12 px-6">
          <div className="mb-10 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="border rounded-lg overflow-hidden bg-card p-2 space-y-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <AdminContainer />
    </Suspense>
  );
}

