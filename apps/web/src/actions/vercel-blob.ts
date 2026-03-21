"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
import { AuditLogService } from "@/server/services/audit-log.service";
import { getStorageProvider } from "@/server/services/storage";

export async function uploadFileToVercelBlobAction(file: File) {
  const storage = await getStorageProvider();
  await storage.put(`recordings/${file.name}`, file, {
    access: "public",
  });

  const authResult = await getBetterAuthSession();
  if (authResult.isOk()) {
    const { user, organization } = authResult.value;
    if (user?.id && organization?.id) {
      void AuditLogService.createAuditLog({
        eventType: "blob_upload",
        resourceType: "blob",
        resourceId: null,
        userId: user.id,
        organizationId: organization.id,
        action: "upload",
        category: "mutation",
        metadata: {
          actionName: "uploadFileToVercelBlobAction",
          fileName: file.name,
        },
      });
    }
  }
}
