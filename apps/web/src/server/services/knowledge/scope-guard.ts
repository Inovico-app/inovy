import type { AuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import {
  TeamQueries,
  UserTeamQueries,
} from "@/server/data-access/teams.queries";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { KnowledgeDocumentDto } from "@/server/dto/knowledge-base.dto";
import { err, ok } from "neverthrow";

/**
 * Centralised scope-permission validation for the Knowledge module.
 *
 * Every CRUD and document operation delegates here instead of duplicating
 * the same checks in KnowledgeBaseService and DocumentProcessingService.
 */
export class ScopeGuard {
  /**
   * Validate that the caller is allowed to perform `operation` on the
   * given scope / scopeId combination.
   *
   * - **project**:      scopeId required; project must exist in the caller's org.
   *                      Write access is implied by project membership.
   * - **team**:          scopeId required; team must exist in the caller's org.
   *                      Write requires team membership.
   * - **organization**:  scopeId required; must match `auth.organizationId`.
   *                      Write requires `orgInstruction:write` permission.
   * - **global**:        scopeId must be `null`.
   *                      Write requires `admin:all` permission.
   */
  static async validate(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    userId: string,
    operation: "read" | "write",
    auth: AuthContext,
    context = "ScopeGuard.validate",
  ): Promise<ActionResult<void>> {
    try {
      if (scope === "project") {
        if (!scopeId) {
          return err(
            ActionErrors.badRequest("Project scope requires scopeId", context),
          );
        }

        const project = await ProjectQueries.findById(
          scopeId,
          auth.organizationId,
        );
        if (!project) {
          return err(ActionErrors.notFound("Project", context));
        }

        // Write access is implied by project membership (validated above).
      } else if (scope === "team") {
        if (!scopeId) {
          return err(
            ActionErrors.badRequest("Team scope requires scopeId", context),
          );
        }

        const team = await TeamQueries.selectTeamById(
          scopeId,
          auth.organizationId,
        );
        if (!team) {
          return err(ActionErrors.notFound("Team", context));
        }

        if (operation === "write") {
          const userTeam = await UserTeamQueries.selectUserTeam(
            userId,
            scopeId,
          );
          if (!userTeam) {
            return err(
              ActionErrors.forbidden(
                "You are not a member of this team",
                { scope, scopeId, userId },
                context,
              ),
            );
          }
        }
      } else if (scope === "organization") {
        if (!scopeId) {
          return err(
            ActionErrors.badRequest(
              "Organization scope requires scopeId",
              context,
            ),
          );
        }

        if (scopeId !== auth.organizationId) {
          return err(
            ActionErrors.forbidden(
              "Cannot access other organization's knowledge base",
              { scope, scopeId, userId },
              context,
            ),
          );
        }

        if (operation === "write") {
          const hasPermission = await checkPermission(
            Permissions.orgInstruction.write,
          );

          if (!hasPermission) {
            return err(
              ActionErrors.forbidden(
                "Organization knowledge base requires admin or manager permissions",
                { scope, scopeId, userId },
                context,
              ),
            );
          }
        }
      } else if (scope === "global") {
        if (scopeId !== null) {
          return err(
            ActionErrors.badRequest(
              "Global scope must have null scopeId",
              context,
            ),
          );
        }

        if (operation === "write") {
          const hasPermission = await checkPermission(Permissions.admin.all);

          if (!hasPermission) {
            return err(
              ActionErrors.forbidden(
                "Global knowledge base requires super admin permissions",
                { scope, scopeId, userId },
                context,
              ),
            );
          }
        }
      }

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to validate scope permissions",
        { scope, scopeId, userId, operation },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to validate scope permissions",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Validate that the caller can access a specific knowledge document.
   *
   * Uses `notFound` (not `forbidden`) for all denial paths to avoid
   * leaking information about resources the caller should not know exist.
   *
   * - **project**:      project must exist in the caller's org.
   * - **team**:          team must exist in the caller's org; caller must be a member.
   * - **organization**:  `document.scopeId` must match `auth.organizationId`.
   * - **global**:        read access allowed (future: restrict further).
   */
  static async validateDocumentAccess(
    document: KnowledgeDocumentDto,
    auth: AuthContext,
    context = "ScopeGuard.validateDocumentAccess",
  ): Promise<ActionResult<void>> {
    try {
      if (document.scope === "project") {
        if (!document.scopeId) {
          return err(
            ActionErrors.badRequest("Project scope requires scopeId", context),
          );
        }

        const project = await ProjectQueries.findById(
          document.scopeId,
          auth.organizationId,
        );
        if (!project) {
          return err(ActionErrors.notFound("Document", context));
        }
      } else if (document.scope === "team") {
        if (!document.scopeId) {
          return err(
            ActionErrors.badRequest("Team scope requires scopeId", context),
          );
        }

        const team = await TeamQueries.selectTeamById(
          document.scopeId,
          auth.organizationId,
        );
        if (!team) {
          return err(ActionErrors.notFound("Document", context));
        }

        const userTeam = await UserTeamQueries.selectUserTeam(
          auth.user.id,
          document.scopeId,
        );
        if (!userTeam) {
          return err(ActionErrors.notFound("Document", context));
        }
      } else if (document.scope === "organization") {
        if (!document.scopeId) {
          return err(
            ActionErrors.badRequest(
              "Organization scope requires scopeId",
              context,
            ),
          );
        }

        if (document.scopeId !== auth.organizationId) {
          return err(ActionErrors.notFound("Document", context));
        }
      } else if (document.scope === "global") {
        // Global scope: allow read access for now.
        // Future: restrict further based on role.
      }

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to validate document access",
        {
          documentId: document.id,
          scope: document.scope,
          scopeId: document.scopeId,
        },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to validate document access",
          error as Error,
          context,
        ),
      );
    }
  }
}
