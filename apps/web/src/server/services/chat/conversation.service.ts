/**
 * Conversation Service
 *
 * Handles conversation lifecycle: CRUD operations, archiving, export.
 * All mutations verify ownership and organization access internally.
 */

import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { ChatQueries } from "@/server/data-access/chat.queries";
import type {
  ChatConversation,
  NewChatConversation,
} from "@/server/db/schema/chat-conversations";
import { err, ok } from "neverthrow";
import type {
  ConversationListResult,
  ConversationStats,
  ListConversationsParams,
  SearchConversationsParams,
} from "./types";

export class ConversationService {
  /**
   * Create a new conversation for a project
   */
  static async createConversation(
    projectId: string,
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<{ conversationId: string }>> {
    try {
      const conversation: NewChatConversation = {
        projectId,
        userId,
        organizationId,
        context: "project",
      };

      const result = await ChatQueries.createConversation(conversation);

      logger.info("Created conversation", { conversationId: result.id });
      return ok({ conversationId: result.id });
    } catch (error) {
      logger.error("Error creating conversation", {
        error,
        projectId,
        userId,
      });
      return err(
        ActionErrors.internal(
          "Failed to create conversation",
          error as Error,
          "ConversationService.createConversation",
        ),
      );
    }
  }

  /**
   * Create a new organization-level conversation
   */
  static async createOrganizationConversation(
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<{ conversationId: string }>> {
    try {
      const conversation: NewChatConversation = {
        projectId: null,
        userId,
        organizationId,
        context: "organization",
      };

      const result = await ChatQueries.createConversation(conversation);

      return ok({ conversationId: result.id });
    } catch (error) {
      logger.error("Error creating organization conversation", {
        error,
        organizationId,
        userId,
      });
      return err(
        ActionErrors.internal(
          "Failed to create organization conversation",
          error as Error,
          "ConversationService.createOrganizationConversation",
        ),
      );
    }
  }

  /**
   * Get conversation history
   *
   * When userId and organizationId are provided, verifies ownership and org access.
   * When omitted, returns messages without access checks (for internal/cache use).
   */
  static async getConversationHistory(
    conversationId: string,
    userId?: string,
    organizationId?: string,
  ) {
    try {
      // Verify access when caller provides identity
      if (userId && organizationId) {
        const conversation =
          await ChatQueries.getConversationById(conversationId);
        if (!conversation) {
          return err(
            ActionErrors.notFound(
              "Conversation",
              "ConversationService.getConversationHistory",
            ),
          );
        }
        if (conversation.userId !== userId) {
          return err(
            ActionErrors.forbidden(
              "Unauthorized to view this conversation",
              { conversationId },
              "ConversationService.getConversationHistory",
            ),
          );
        }

        try {
          assertOrganizationAccess(
            conversation.organizationId,
            organizationId,
            "ConversationService.getConversationHistory",
          );
        } catch {
          return err(
            ActionErrors.notFound(
              "Conversation",
              "ConversationService.getConversationHistory",
            ),
          );
        }
      }

      const messages =
        await ChatQueries.getMessagesByConversationId(conversationId);

      return ok(messages);
    } catch (error) {
      logger.error("Error getting conversation history", {
        error,
        conversationId,
      });
      return err(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Delete conversation (hard delete with ownership + org access check)
   */
  static async deleteConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<void>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.deleteConversation",
          ),
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to delete this conversation",
            { conversationId },
            "ConversationService.deleteConversation",
          ),
        );
      }

      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ConversationService.deleteConversation",
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.deleteConversation",
          ),
        );
      }

      await ChatQueries.deleteConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error deleting conversation", { error, conversationId });
      return err(
        ActionErrors.internal(
          "Failed to delete conversation",
          error as Error,
          "ConversationService.deleteConversation",
        ),
      );
    }
  }

  /**
   * List conversations with pagination
   */
  static async listConversations(
    params: ListConversationsParams,
  ): Promise<ActionResult<ConversationListResult>> {
    try {
      const result = await ChatQueries.getConversationsWithPagination(params);
      return ok(result);
    } catch (error) {
      logger.error("Error listing conversations", { error, params });
      return err(
        ActionErrors.internal(
          "Failed to list conversations",
          error as Error,
          "ConversationService.listConversations",
        ),
      );
    }
  }

  /**
   * Search conversations
   */
  static async searchConversations(
    params: SearchConversationsParams,
  ): Promise<
    ActionResult<(ChatConversation & { lastMessage?: string | null })[]>
  > {
    try {
      const conversations = await ChatQueries.searchConversations(params);
      return ok(conversations);
    } catch (error) {
      logger.error("Error searching conversations", { error, params });
      return err(
        ActionErrors.internal(
          "Failed to search conversations",
          error as Error,
          "ConversationService.searchConversations",
        ),
      );
    }
  }

  /**
   * Soft delete conversation
   */
  static async softDeleteConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<void>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.softDeleteConversation",
          ),
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to delete this conversation",
            { conversationId },
            "ConversationService.softDeleteConversation",
          ),
        );
      }

      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ConversationService.softDeleteConversation",
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.softDeleteConversation",
          ),
        );
      }

      await ChatQueries.softDeleteConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error soft deleting conversation", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to soft delete conversation",
          error as Error,
          "ConversationService.softDeleteConversation",
        ),
      );
    }
  }

  /**
   * Restore conversation
   */
  static async restoreConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<boolean>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.restoreConversation",
          ),
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to restore this conversation",
            { conversationId },
            "ConversationService.restoreConversation",
          ),
        );
      }

      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ConversationService.restoreConversation",
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.restoreConversation",
          ),
        );
      }

      const restored = await ChatQueries.restoreConversation(conversationId);
      return ok(restored);
    } catch (error) {
      logger.error("Error restoring conversation", { error, conversationId });
      return err(
        ActionErrors.internal(
          "Failed to restore conversation",
          error as Error,
          "ConversationService.restoreConversation",
        ),
      );
    }
  }

  /**
   * Archive conversation
   */
  static async archiveConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<void>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.archiveConversation",
          ),
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to archive this conversation",
            { conversationId },
            "ConversationService.archiveConversation",
          ),
        );
      }

      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ConversationService.archiveConversation",
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.archiveConversation",
          ),
        );
      }

      await ChatQueries.archiveConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error archiving conversation", { error, conversationId });
      return err(
        ActionErrors.internal(
          "Failed to archive conversation",
          error as Error,
          "ConversationService.archiveConversation",
        ),
      );
    }
  }

  /**
   * Unarchive conversation
   */
  static async unarchiveConversation(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<void>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.unarchiveConversation",
          ),
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to unarchive this conversation",
            { conversationId },
            "ConversationService.unarchiveConversation",
          ),
        );
      }

      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ConversationService.unarchiveConversation",
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.unarchiveConversation",
          ),
        );
      }

      await ChatQueries.unarchiveConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error unarchiving conversation", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to unarchive conversation",
          error as Error,
          "ConversationService.unarchiveConversation",
        ),
      );
    }
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(
    userId: string,
    organizationId?: string,
  ): Promise<ActionResult<ConversationStats>> {
    try {
      const stats = await ChatQueries.getConversationStats(
        userId,
        organizationId,
      );
      return ok(stats);
    } catch (error) {
      logger.error("Error getting conversation stats", { error, userId });
      return err(
        ActionErrors.internal(
          "Failed to get conversation statistics",
          error as Error,
          "ConversationService.getConversationStats",
        ),
      );
    }
  }

  /**
   * Export conversation as text
   */
  static async exportConversationAsText(
    conversationId: string,
    userId: string,
  ): Promise<ActionResult<string>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.exportConversationAsText",
          ),
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to export this conversation",
            { conversationId },
            "ConversationService.exportConversationAsText",
          ),
        );
      }

      const messages =
        await ChatQueries.getMessagesByConversationId(conversationId);

      const { formatConversationAsText } = await import("@/lib/export-utils");
      const text = formatConversationAsText(conversation, messages);

      return ok(text);
    } catch (error) {
      logger.error("Error exporting conversation as text", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to export conversation as text",
          error as Error,
          "ConversationService.exportConversationAsText",
        ),
      );
    }
  }

  /**
   * Export conversation as PDF
   */
  static async exportConversationAsPDF(
    conversationId: string,
    userId: string,
  ): Promise<ActionResult<Blob>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ConversationService.exportConversationAsPDF",
          ),
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to export this conversation",
            { conversationId },
            "ConversationService.exportConversationAsPDF",
          ),
        );
      }

      const messages =
        await ChatQueries.getMessagesByConversationId(conversationId);

      const { generateConversationPDF } = await import("@/lib/export-utils");
      const pdf = await generateConversationPDF(conversation, messages);

      return ok(pdf);
    } catch (error) {
      logger.error("Error exporting conversation as PDF", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to export conversation as PDF",
          error as Error,
          "ConversationService.exportConversationAsPDF",
        ),
      );
    }
  }
}
