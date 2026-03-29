import { getBetterAuthSession } from "@/lib/better-auth-session";
import { PermissionProvider } from "@/lib/permissions/permission-provider";
import { computePermissionSet } from "@/lib/permissions/policy-map";
import { isValidRole, type Role } from "@/lib/permissions/types";

export default async function MainTemplate({
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
    <PermissionProvider role={role} permissionKeys={permissionKeys}>
      {children}
    </PermissionProvider>
  );
}
