import { headers } from "next/headers";
import type { MiddlewareResult } from "next-safe-action";

import { logger } from "../logger";
import { AuditLogService } from "../../server/services/audit-log.service";
import { AuditContextImpl } from "./audit-context";
import type { ActionContext, Metadata } from "./action-client";

/**
 * Audit logging middleware for server actions.
 * Creates an AuditContext, passes it to the action, and fire-and-forgets
 * an audit log entry in a finally block.
 */
export async function auditLoggingMiddleware({
  next,
  ctx,
  metadata,
}: {
  next: <NC extends object>(opts: {
    ctx: NC;
  }) => Promise<MiddlewareResult<string, NC>>;
  ctx: ActionContext;
  metadata: Metadata;
}) {
  const auditCtx = new AuditContextImpl();
  const auditMeta = metadata.audit;

  // Extract request info (IP, user-agent) from headers
  const reqHeaders = await headers();
  const { ipAddress, userAgent } =
    AuditLogService.extractRequestInfo(reqHeaders);

  let actionSucceeded = false;

  try {
    const result = await next({ ctx: { ...ctx, audit: auditCtx } });
    actionSucceeded = true;
    return result;
  } finally {
    // Fire-and-forget audit log creation — only if we have a user and org
    if (ctx.user && ctx.organizationId) {
      const baseMetadata: Record<string, unknown> = {
        actionSucceeded,
        actionName: metadata.name ?? "unknown",
        ...auditCtx.metadata,
      };

      if (auditMeta) {
        // Annotated action — use explicit audit config
        AuditLogService.createAuditLog({
          eventType: `${auditMeta.resourceType}_${auditMeta.action}`,
          resourceType: auditMeta.resourceType,
          resourceId: auditCtx.resourceId ?? undefined,
          userId: ctx.user.id,
          organizationId: ctx.organizationId,
          action: auditMeta.action,
          category: auditMeta.category,
          ipAddress,
          userAgent,
          metadata: baseMetadata,
        }).catch((error) => {
          logger.error("Failed to create audit log (fire-and-forget)", {
            component: "audit-middleware",
            error: error instanceof Error ? error.message : String(error),
          });
        });
      } else {
        // Fallback — unannotated action
        AuditLogService.createAuditLog({
          eventType: `unknown_${metadata.name ?? "action"}`,
          resourceType: "settings",
          userId: ctx.user.id,
          organizationId: ctx.organizationId,
          action: "update",
          category: "mutation",
          ipAddress,
          userAgent,
          metadata: { ...baseMetadata, fallback: true },
        }).catch((error) => {
          logger.error(
            "Failed to create fallback audit log (fire-and-forget)",
            {
              component: "audit-middleware",
              error: error instanceof Error ? error.message : String(error),
            },
          );
        });
      }
    }
  }
}
