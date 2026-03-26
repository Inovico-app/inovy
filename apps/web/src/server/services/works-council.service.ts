import { ok, err } from "neverthrow";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { WorksCouncilQueries } from "@/server/data-access/works-council.queries";
import { AuditLogService } from "@/server/services/audit-log.service";
import type { WorksCouncilApproval } from "@/server/db/schema/works-council-approvals";

export class WorksCouncilService {
  /**
   * Register a Works Council (Ondernemingsraad) approval.
   * Creates the approval record and bulk-creates consent records
   * for all org members who don't already have individual consent.
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

      void AuditLogService.createAuditLog({
        eventType: "works_council_approval_create",
        resourceType: "consent",
        resourceId: approval.id,
        userId: params.uploadedBy,
        organizationId: params.organizationId,
        action: "create",
        category: "mutation",
        metadata: {
          approvalDate: params.approvalDate.toISOString(),
          scopeDescription: params.scopeDescription,
        },
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
   * Individual consent records created under this approval remain
   * (users who explicitly opted out keep their opt-out status).
   */
  static async revokeApproval(
    approvalId: string,
    revokedBy: string,
    organizationId: string,
  ): Promise<ActionResult<WorksCouncilApproval>> {
    try {
      const revoked = await WorksCouncilQueries.revoke(approvalId, revokedBy);

      if (!revoked) {
        return err(ActionErrors.notFound("Works Council approval"));
      }

      void AuditLogService.createAuditLog({
        eventType: "works_council_approval_revoke",
        resourceType: "consent",
        resourceId: approvalId,
        userId: revokedBy,
        organizationId,
        action: "delete",
        category: "mutation",
      });

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

  /**
   * Get the active Works Council approval for an organization.
   */
  static async getActiveApproval(
    organizationId: string,
  ): Promise<ActionResult<WorksCouncilApproval | null>> {
    try {
      const approval =
        await WorksCouncilQueries.findActiveByOrganization(organizationId);
      return ok(approval);
    } catch (error) {
      return err(
        ActionErrors.internal("Failed to get Works Council approval", error),
      );
    }
  }

  /**
   * Get all Works Council approvals for an organization (history).
   */
  static async getApprovalHistory(
    organizationId: string,
  ): Promise<ActionResult<WorksCouncilApproval[]>> {
    try {
      const approvals =
        await WorksCouncilQueries.findAllByOrganization(organizationId);
      return ok(approvals);
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to get Works Council approval history",
          error,
        ),
      );
    }
  }
}
