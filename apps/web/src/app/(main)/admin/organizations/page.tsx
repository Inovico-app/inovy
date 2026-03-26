import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationList } from "@/features/admin/components/organization/organization-list";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export const metadata = {
  title: "Organizations",
  description: "Manage all organizations in the system",
};

async function OrganizationsContent() {
  // Layout already guards auth + admin. This adds the superadmin check.
  const hasSuperAdminPermission = await checkPermission(
    Permissions.superadmin.all,
  );

  if (!hasSuperAdminPermission) {
    redirect("/");
  }

  const t = await getTranslations("admin.organizations");

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-24 w-full" />
            ))}
          </div>
        }
      >
        <OrganizationList />
      </Suspense>
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-4xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-24 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <OrganizationsContent />
    </Suspense>
  );
}
