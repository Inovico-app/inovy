import { OrganizationList } from "@/features/admin/components/organization-list";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { isSuperAdmin } from "@/lib/rbac/rbac";
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

  const { user, member } = authResult.value;
  const session = { user, member };

  // Check if user is superadmin
  if (!isSuperAdmin(session)) {
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

