import { resolveAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  buildDpaContext,
  DPA_CONTACT_EMAIL,
} from "@/features/admin/components/compliance/dpa/dpa-data";
import { DpaPdfDocument } from "@/features/admin/components/compliance/dpa/dpa-pdf-document";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { AuditLogService } from "@/server/services/audit-log.service";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await resolveAuthContext("DPA PDF download");
  if (authResult.isErr()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasPermission = await checkPermission(Permissions.admin.all);
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user, organizationId } = authResult.value;
  const org = await OrganizationQueries.findByIdDirect(organizationId);
  const orgName = org?.name ?? "Organisatie";
  const context = buildDpaContext(orgName, DPA_CONTACT_EMAIL);

  try {
    const buffer = await renderToBuffer(DpaPdfDocument({ context }));

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `verwerkersovereenkomst-${orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${dateStr}.pdf`;

    void AuditLogService.createAuditLog({
      eventType: "dpa_download",
      resourceType: "organization",
      resourceId: organizationId,
      userId: user.id,
      organizationId,
      action: "export",
      category: "read",
      metadata: { generatedAt: dateStr },
    });

    logger.info("DPA PDF generated and downloaded", {
      component: "DPA PDF route",
      organizationId,
      userId: user.id,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Failed to generate DPA PDF", {
      component: "DPA PDF route",
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
