import { getBetterAuthSession } from "@/lib/better-auth-session";
import { hasExactRole } from "@/lib/permissions/predicates";
import type { Role } from "@/lib/permissions/types";
import { ModelProvenanceService } from "@/server/services/model-provenance.service";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/agent/sbom
 * Returns the AI model Software Bill of Materials.
 * Lists all AI models used by the application, their providers,
 * and purposes. Useful for compliance audits (EU AI Act, NIST AI RMF).
 *
 * Requires superadmin role.
 */
export async function GET() {
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.member
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { member, user } = authResult.value;
  if (
    !hasExactRole("superadmin").check({
      role: member.role as Role,
      userId: user?.id ?? "",
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sbom = ModelProvenanceService.getSBOM();
  return NextResponse.json(sbom);
}
