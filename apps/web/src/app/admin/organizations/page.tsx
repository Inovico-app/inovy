import { OrganizationList } from "@/features/admin/components/organization-list";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Organizations",
  description: "Manage all organizations in the system",
};

export default async function OrganizationsPage() {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    redirect("/sign-in");
  }

  const { user } = authResult.value;

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has superadmin permissions
  const hasSuperAdminPermission = await checkPermission(
    Permissions.organization.list
  );

  if (!hasSuperAdminPermission) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">
          Manage all organizations in the system
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-8">Loading organizations...</div>
        }
      >
        <OrganizationList />
      </Suspense>
    </div>
  );
}

