import { PageLayout } from "@/components/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { UserManagementTable } from "@/features/admin/components/user-management-table";
import { ROLES } from "@/lib/rbac";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function AdminUsersHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        User Management
      </h1>
      <p className="text-muted-foreground">
        View and manage all organization members
      </p>
    </div>
  );
}

async function AdminUsersContainer() {
  // Check if user is authenticated and has admin role
  const sessionResult = await getAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/");
  }

  const userRoles =
    sessionResult.value.user?.roles?.map((role) => role.toLowerCase()) ?? [];

  if (
    !userRoles.includes(ROLES.ADMIN) ||
    !userRoles.includes(ROLES.SUPER_ADMIN)
  ) {
    redirect("/");
  }

  return (
    <PageLayout>
      <AdminUsersHeader />

      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          }
        >
          <UserManagementTable />
        </Suspense>
      </div>
    </PageLayout>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      }
    >
      <AdminUsersContainer />
    </Suspense>
  );
}

