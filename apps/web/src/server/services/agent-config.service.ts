import { logger } from "@/lib/logger";
import { err, ok, type Result } from "neverthrow";
import {
  ActionErrors,
  type ActionError,
} from "@/lib/server-action-client/action-errors";
import { OrganizationQueries } from "../data-access/organization.queries";

/**
 * Service for managing agent configuration per organization
 */
export class AgentConfigService {
  /**
   * Check if agent is enabled for an organization
   * @param organizationId - Organization ID
   * @returns Result with boolean indicating if agent is enabled
   */
  static async isAgentEnabled(
    organizationId: string
  ): Promise<Result<boolean, ActionError>> {
    try {
      const agentEnabled = await OrganizationQueries.getAgentConfig(
        organizationId
      );

      if (agentEnabled === null) {
        return err(
          ActionErrors.notFound(
            "Organization",
            "AgentConfigService.isAgentEnabled"
          )
        );
      }

      return ok(agentEnabled);
    } catch (error) {
      logger.error("Failed to check agent status", {
        component: "AgentConfigService.isAgentEnabled",
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to check agent status",
          error as Error,
          "AgentConfigService.isAgentEnabled"
        )
      );
    }
  }

  /**
   * Get agent configuration for an organization
   * @param organizationId - Organization ID
   * @returns Result with agent enabled status
   */
  static async getAgentConfig(
    organizationId: string
  ): Promise<Result<boolean, ActionError>> {
    return this.isAgentEnabled(organizationId);
  }

  /**
   * Update agent configuration for an organization
   * @param organizationId - Organization ID
   * @param enabled - Whether agent is enabled
   * @returns Result indicating success or failure
   */
  static async updateAgentConfig(
    organizationId: string,
    enabled: boolean
  ): Promise<Result<boolean, ActionError>> {
    try {
      const success = await OrganizationQueries.updateAgentConfig(
        organizationId,
        enabled
      );

      if (!success) {
        return err(
          ActionErrors.notFound(
            "Organization",
            "AgentConfigService.updateAgentConfig"
          )
        );
      }

      logger.info("Agent configuration updated", {
        component: "AgentConfigService.updateAgentConfig",
        organizationId,
        enabled,
      });

      return ok(true);
    } catch (error) {
      logger.error("Failed to update agent configuration", {
        component: "AgentConfigService.updateAgentConfig",
        organizationId,
        enabled,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to update agent configuration",
          error as Error,
          "AgentConfigService.updateAgentConfig"
        )
      );
    }
  }
}

