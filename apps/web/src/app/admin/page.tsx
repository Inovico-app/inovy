import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLES } from "@/lib";
import { getAuthSession } from "@/lib/auth";
import { BarChart3Icon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function AdminMenuGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <Link href="/admin/users" className="block h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              View and manage organization members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View all users, manage roles, and monitor user activity
            </p>
          </CardContent>
        </Link>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <div className="block h-full p-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3Icon className="h-5 w-5" />
            <h3 className="font-semibold">System Analytics</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            View system-wide statistics and metrics
          </p>
        </div>
      </Card>
    </div>
  );
}

async function AdminContainer() {
  // Check if user is authenticated and has admin role
  const sessionResult = await getAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/");
  }

  const userRoles =
    sessionResult.value.user?.roles?.map((role) => role.toLowerCase()) ?? [];

  if (
    !userRoles.includes(ROLES.ADMIN) &&
    !userRoles.includes(ROLES.SUPER_ADMIN)
  ) {
    redirect("/");
  }

  return (
    <>
      <div className="container mx-auto py-8 px-4">
        <AdminMenuGrid />
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">System Overview</h2>
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 " />
          ))}
        </div>
      }
    >
      <AdminContainer />
    </Suspense>
  );
}

