import { PageLayout } from "@/components/page-layout";
import { SessionTimeoutProvider } from "@/features/auth/components/session-timeout-provider";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { PermissionProvider } from "@/lib/permissions/permission-provider";
import { computePermissionSet } from "@/lib/permissions/policy-map";
import { isValidRole, type Role } from "@/lib/permissions/types";
import { Suspense } from "react";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await getBetterAuthSession();

  let role: Role = "viewer";
  let permissionKeys: string[] = [];

  if (sessionResult.isOk()) {
    const { member } = sessionResult.value;
    if (member?.role) {
      role = isValidRole(member.role) ? member.role : "viewer";
      permissionKeys = [...computePermissionSet(role)];
    }
  }

  return (
    <Suspense>
      <SessionTimeoutProvider>
        <PermissionProvider role={role} permissionKeys={permissionKeys}>
          <PageLayout>{children}</PageLayout>
        </PermissionProvider>
      </SessionTimeoutProvider>
    </Suspense>
  );
}
