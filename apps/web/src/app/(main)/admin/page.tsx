import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  BarChart3Icon,
  Building2Icon,
  FileTextIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function AdminMenuGrid() {
  const menuItems = [
    {
      href: "/admin/users",
      icon: UsersIcon,
      title: "User Management",
      description: "View and manage organization members",
      details: "Manage roles, permissions, and user activity",
    },
    {
      href: "/admin/organizations",
      icon: Building2Icon,
      title: "Organizations",
      description: "Manage all organizations in the system",
      details: "View, create, and edit organizations",
    },
    {
      href: "/admin/audit-logs",
      icon: FileTextIcon,
      title: "Audit Logs",
      description: "View system activity and changes",
      details: "Track user actions and system events",
    },
    {
      href: "#",
      icon: BarChart3Icon,
      title: "System Analytics",
      description: "View system-wide statistics",
      details: "Coming soon",
      disabled: true,
    },
    {
      href: "#",
      icon: SettingsIcon,
      title: "System Settings",
      description: "Configure system preferences",
      details: "Coming soon",
      disabled: true,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {menuItems.map((item) => (
        <Link
          key={item.title}
          href={item.disabled ? "#" : item.href}
          className={
            item.disabled ? "pointer-events-none opacity-60" : "group"
          }
        >
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="rounded-lg bg-primary/10 p-2.5 ring-1 ring-primary/20 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  {item.title}
                </CardTitle>
              </div>
              <CardDescription className="mt-2">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.details}</p>
            </CardContent>
          </Card>
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
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, organizations, and system settings
        </p>
      </div>

      <AdminMenuGrid />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-8 px-4">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      }
    >
      <AdminContainer />
    </Suspense>
  );
}

