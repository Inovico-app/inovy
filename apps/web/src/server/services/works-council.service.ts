import { ok, err } from "neverthrow";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { WorksCouncilQueries } from "@/server/data-access/works-council.queries";
import type { WorksCouncilApproval } from "@/server/db/schema/works-council-approvals";

export class WorksCouncilService {
  /**
   * Register a Works Council (Ondernemingsraad) approval.
   * Audit logging is handled by the authorizedActionClient middleware.
   */
  static async registerApproval(params: {
    organizationId: string;
    documentUrl: string;
    approvalDate: Date;
    scopeDescription?: string;
    uploadedBy: string;
  }): Promise<ActionResult<WorksCouncilApproval>> {
    try {
      const approval = await WorksCouncilQueries.create({
        organizationId: params.organizationId,
        documentUrl: params.documentUrl,
        approvalDate: params.approvalDate,
        scopeDescription: params.scopeDescription,
        status: "active",
        uploadedBy: params.uploadedBy,
      });

      logger.info("Works Council approval registered", {
        component: "WorksCouncilService",
        approvalId: approval.id,
        organizationId: params.organizationId,
      });

      return ok(approval);
    } catch (error) {
      logger.error("Failed to register Works Council approval", {
        component: "WorksCouncilService",
        organizationId: params.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to register Works Council approval",
          error,
        ),
      );
    }
  }

  /**
   * Revoke a Works Council approval.
   * Individual consent records remain unaffected.
   * Audit logging is handled by the authorizedActionClient middleware.
   */
  static async revokeApproval(
    approvalId: string,
    revokedBy: string,
  ): Promise<ActionResult<WorksCouncilApproval>> {
    try {
      const revoked = await WorksCouncilQueries.revoke(approvalId, revokedBy);

      if (!revoked) {
        return err(ActionErrors.notFound("Works Council approval"));
      }

      logger.info("Works Council approval revoked", {
        component: "WorksCouncilService",
        approvalId,
        revokedBy,
      });

      return ok(revoked);
    } catch (error) {
      logger.error("Failed to revoke Works Council approval", {
        component: "WorksCouncilService",
        approvalId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal("Failed to revoke Works Council approval", error),
      );
    }
  }
}
