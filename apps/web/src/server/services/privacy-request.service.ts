import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { PrivacyRequestsQueries } from "../data-access/privacy-requests.queries";
import type {
  PrivacyRequest,
  PrivacyRequestType,
  ProcessingScope,
} from "../db/schema/privacy-requests";
import { AuditLogService } from "./audit-log.service";

/**
 * Privacy Request Service
 * Handles GDPR Right to Restriction (Art. 18) and Right to Object (Art. 21)
 */
export class PrivacyRequestService {
  /**
   * Submit a new privacy request (restriction or objection)
   */
  static async submitRequest(params: {
    userId: string;
    organizationId: string;
    type: PrivacyRequestType;
    scope: ProcessingScope;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ActionResult<PrivacyRequest>> {
    const {
      userId,
      organizationId,
      type,
      scope,
      reason,
      ipAddress,
      userAgent,
    } = params;

    try {
      // Check for existing active request with same type and scope
      const existing = await PrivacyRequestsQueries.findActive(
        userId,
        type,
        scope,
      );
      if (existing) {
        return err(
          ActionErrors.validation(
            `An active ${type} request for ${scope} already exists`,
            { requestId: existing.id },
          ),
        );
      }

      const request = await PrivacyRequestsQueries.insert({
        userId,
        organizationId,
        type,
        scope,
        status: "active",
        reason: reason ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });

      // Log the request
      await AuditLogService.createAuditLog({
        eventType: "settings_updated",
        resourceType: "user",
        resourceId: request.id,
        userId,
        organizationId,
        action: "create",
        metadata: {
          privacyRequestType: type,
          scope,
          reason: reason ?? null,
        },
      });

      logger.info("Privacy request submitted", {
        component: "PrivacyRequestService.submitRequest",
        userId,
        type,
        scope,
        requestId: request.id,
      });

      return ok(request);
    } catch (error) {
      logger.error("Failed to submit privacy request", {
        component: "PrivacyRequestService.submitRequest",
        userId,
        type,
        scope,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to submit privacy request",
          error as Error,
          "PrivacyRequestService.submitRequest",
        ),
      );
    }
  }

  /**
   * Withdraw a privacy request (user-initiated)
   */
  static async withdrawRequest(
    requestId: string,
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<void>> {
    try {
      const request = await PrivacyRequestsQueries.findById(requestId);
      if (!request || request.userId !== userId) {
        return err(
          ActionErrors.notFound(
            "Privacy request not found",
            "PrivacyRequestService.withdrawRequest",
          ),
        );
      }

      if (request.status !== "active") {
        return err(
          ActionErrors.validation("Only active requests can be withdrawn", {
            status: request.status,
          }),
        );
      }

      await PrivacyRequestsQueries.withdraw(requestId);

      await AuditLogService.createAuditLog({
        eventType: "settings_updated",
        resourceType: "user",
        resourceId: requestId,
        userId,
        organizationId,
        action: "update",
        metadata: {
          privacyRequestType: request.type,
          scope: request.scope,
          action: "withdrawn",
        },
      });

      logger.info("Privacy request withdrawn", {
        component: "PrivacyRequestService.withdrawRequest",
        userId,
        requestId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to withdraw privacy request", {
        component: "PrivacyRequestService.withdrawRequest",
        userId,
        requestId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to withdraw privacy request",
          error as Error,
          "PrivacyRequestService.withdrawRequest",
        ),
      );
    }
  }

  /**
   * Get all active privacy requests for a user
   */
  static async getActiveRequests(
    userId: string,
  ): Promise<ActionResult<PrivacyRequest[]>> {
    try {
      const requests =
        await PrivacyRequestsQueries.findAllActiveByUserId(userId);
      return ok(requests);
    } catch (error) {
      logger.error("Failed to get active privacy requests", {
        component: "PrivacyRequestService.getActiveRequests",
        userId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get privacy requests",
          error as Error,
          "PrivacyRequestService.getActiveRequests",
        ),
      );
    }
  }

  /**
   * Get full request history for a user
   */
  static async getRequestHistory(
    userId: string,
  ): Promise<ActionResult<PrivacyRequest[]>> {
    try {
      const requests = await PrivacyRequestsQueries.findAllByUserId(userId);
      return ok(requests);
    } catch (error) {
      logger.error("Failed to get privacy request history", {
        component: "PrivacyRequestService.getRequestHistory",
        userId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get privacy request history",
          error as Error,
          "PrivacyRequestService.getRequestHistory",
        ),
      );
    }
  }

  /**
   * Check if a specific processing activity is restricted for a user.
   * Used by processing services to check before performing operations.
   */
  static async isProcessingRestricted(
    userId: string,
    scope: ProcessingScope,
  ): Promise<boolean> {
    try {
      // Check for both specific scope and "all_processing"
      const [specificRestricted, allRestricted] = await Promise.all([
        PrivacyRequestsQueries.isProcessingRestricted(userId, scope),
        PrivacyRequestsQueries.isProcessingRestricted(userId, "all_processing"),
      ]);
      return specificRestricted || allRestricted;
    } catch (error) {
      logger.error("Failed to check processing restriction", {
        component: "PrivacyRequestService.isProcessingRestricted",
        userId,
        scope,
        error,
      });
      // Fail-safe: if we can't check, assume restricted to protect user rights
      return true;
    }
  }
}
