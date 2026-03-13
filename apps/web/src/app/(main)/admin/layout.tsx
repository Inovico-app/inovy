import { AdminNav } from "@/features/admin/components/admin-nav";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const authResult = await getBetterAuthSession();
  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/");
  }

  const hasAdminPermission = await checkPermission(Permissions.admin.all);
  if (!hasAdminPermission) {
    redirect("/");
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <Suspense>
        <AdminNav />
      </Suspense>
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
