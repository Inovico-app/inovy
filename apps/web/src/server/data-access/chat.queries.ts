import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import {
  chatConversations,
  chatMessages,
  type ChatConversation,
  type ChatMessage,
  type NewChatConversation,
  type NewChatMessage,
} from "@/server/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export class ChatQueries {
  /**
   * Create a new conversation
   */
  static async createConversation(
    conversation: NewChatConversation
  ): Promise<ChatConversation> {
    try {
      const [result] = await db
        .insert(chatConversations)
        .values(conversation)
        .returning();

      logger.info("Created conversation", { conversationId: result.id });
      return result;
    } catch (error) {
      logger.error("Error creating conversation", { error, conversation });
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  static async getConversationById(
    conversationId: string
  ): Promise<ChatConversation | null> {
    try {
      const [result] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId))
        .limit(1);

      return result || null;
    } catch (error) {
      logger.error("Error getting conversation", { error, conversationId });
      throw error;
    }
  }

  /**
   * Get conversations by project ID
   */
  static async getConversationsByProjectId(
    projectId: string,
    userId: string
  ): Promise<ChatConversation[]> {
    try {
      return await db
        .select()
        .from(chatConversations)
        .where(
          and(
            eq(chatConversations.projectId, projectId),
            eq(chatConversations.userId, userId)
          )
        )
        .orderBy(desc(chatConversations.updatedAt));
    } catch (error) {
      logger.error("Error getting conversations by project", {
        error,
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get conversations by organization ID (for organization-level chatbot)
   */
  static async getConversationsByOrganizationId(
    organizationId: string,
    userId: string
  ): Promise<ChatConversation[]> {
    try {
      return await db
        .select()
        .from(chatConversations)
        .where(
          and(
            eq(chatConversations.organizationId, organizationId),
            eq(chatConversations.userId, userId),
            sql`${chatConversations.projectId} IS NULL` // Only organization-level conversations
          )
        )
        .orderBy(desc(chatConversations.updatedAt));
    } catch (error) {
      logger.error("Error getting conversations by organization", {
        error,
        organizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    try {
      await db
        .update(chatConversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(chatConversations.id, conversationId));

      logger.info("Updated conversation title", { conversationId, title });
    } catch (error) {
      logger.error("Error updating conversation title", {
        error,
        conversationId,
        title,
      });
      throw error;
    }
  }

  /**
   * Create a new message
   */
  static async createMessage(message: NewChatMessage): Promise<ChatMessage> {
    try {
      const [result] = await db
        .insert(chatMessages)
        .values(message)
        .returning();

      // Update conversation's updatedAt timestamp
      await db
        .update(chatConversations)
        .set({ updatedAt: new Date() })
        .where(eq(chatConversations.id, message.conversationId));

      logger.info("Created message", {
        messageId: result.id,
        conversationId: message.conversationId,
      });
      return result;
    } catch (error) {
      logger.error("Error creating message", { error, message });
      throw error;
    }
  }

  /**
   * Get messages by conversation ID
   */
  static async getMessagesByConversationId(
    conversationId: string
  ): Promise<ChatMessage[]> {
    try {
      return await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversationId))
        .orderBy(chatMessages.createdAt);
    } catch (error) {
      logger.error("Error getting messages", { error, conversationId });
      throw error;
    }
  }

  /**
   * Delete conversation and all its messages
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Messages will be deleted automatically due to CASCADE
      await db
        .delete(chatConversations)
        .where(eq(chatConversations.id, conversationId));

      logger.info("Deleted conversation", { conversationId });
    } catch (error) {
      logger.error("Error deleting conversation", { error, conversationId });
      throw error;
    }
  }

  /**
   * Get conversations with pagination and filtering
   */
  static async getConversationsWithPagination(params: {
    userId: string;
    organizationId?: string;
    projectId?: string;
    context?: "project" | "organization";
    filter?: "all" | "active" | "archived" | "deleted";
    page?: number;
    limit?: number;
  }): Promise<{ conversations: ChatConversation[]; total: number }> {
    try {
      const {
        userId,
        organizationId,
        projectId,
        context,
        filter = "active",
        page = 1,
        limit = 20,
      } = params;

      const offset = (page - 1) * limit;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Build WHERE conditions
      const conditions = [eq(chatConversations.userId, userId)];

      // Filter out permanently deleted conversations (deletedAt > 30 days)
      conditions.push(
        sql`(${chatConversations.deletedAt} IS NULL OR ${chatConversations.deletedAt} > ${thirtyDaysAgo})`
      );

      if (organizationId) {
        conditions.push(eq(chatConversations.organizationId, organizationId));
      }

      if (context === "project" && projectId) {
        conditions.push(eq(chatConversations.projectId, projectId));
      } else if (context === "organization") {
        conditions.push(sql`${chatConversations.projectId} IS NULL`);
      }

      // Apply filter conditions
      if (filter === "active") {
        conditions.push(sql`${chatConversations.deletedAt} IS NULL`);
        conditions.push(sql`${chatConversations.archivedAt} IS NULL`);
      } else if (filter === "archived") {
        conditions.push(sql`${chatConversations.archivedAt} IS NOT NULL`);
        conditions.push(sql`${chatConversations.deletedAt} IS NULL`);
      } else if (filter === "deleted") {
        conditions.push(sql`${chatConversations.deletedAt} IS NOT NULL`);
      }

      // Get conversations
      const conversations = await db
        .select()
        .from(chatConversations)
        .where(and(...conditions))
        .orderBy(desc(chatConversations.updatedAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatConversations)
        .where(and(...conditions));

      return { conversations, total: Number(count) };
    } catch (error) {
      logger.error("Error getting conversations with pagination", {
        error,
        params,
      });
      throw error;
    }
  }

  /**
   * Search conversations by title
   */
  static async searchConversations(params: {
    userId: string;
    query: string;
    organizationId?: string;
    projectId?: string;
    context?: "project" | "organization";
    limit?: number;
  }): Promise<ChatConversation[]> {
    try {
      const { userId, query, organizationId, projectId, context, limit = 20 } =
        params;

      const conditions = [
        eq(chatConversations.userId, userId),
        sql`${chatConversations.deletedAt} IS NULL`, // Exclude deleted
        sql`${chatConversations.title} ILIKE ${`%${query}%`}`, // Case-insensitive search
      ];

      if (organizationId) {
        conditions.push(eq(chatConversations.organizationId, organizationId));
      }

      if (context === "project" && projectId) {
        conditions.push(eq(chatConversations.projectId, projectId));
      } else if (context === "organization") {
        conditions.push(sql`${chatConversations.projectId} IS NULL`);
      }

      return await db
        .select()
        .from(chatConversations)
        .where(and(...conditions))
        .orderBy(desc(chatConversations.updatedAt))
        .limit(limit);
    } catch (error) {
      logger.error("Error searching conversations", { error, params });
      throw error;
    }
  }

  /**
   * Soft delete conversation
   */
  static async softDeleteConversation(conversationId: string): Promise<void> {
    try {
      await db
        .update(chatConversations)
        .set({ deletedAt: new Date() })
        .where(eq(chatConversations.id, conversationId));

      logger.info("Soft deleted conversation", { conversationId });
    } catch (error) {
      logger.error("Error soft deleting conversation", {
        error,
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Restore conversation (if within 30 days)
   */
  static async restoreConversation(conversationId: string): Promise<boolean> {
    try {
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, conversationId))
        .limit(1);

      if (!conversation || !conversation.deletedAt) {
        return false;
      }

      // Check if within 30-day window
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (conversation.deletedAt < thirtyDaysAgo) {
        logger.warn("Cannot restore conversation deleted more than 30 days ago", {
          conversationId,
        });
        return false;
      }

      await db
        .update(chatConversations)
        .set({ deletedAt: null })
        .where(eq(chatConversations.id, conversationId));

      logger.info("Restored conversation", { conversationId });
      return true;
    } catch (error) {
      logger.error("Error restoring conversation", { error, conversationId });
      throw error;
    }
  }

  /**
   * Archive conversation
   */
  static async archiveConversation(conversationId: string): Promise<void> {
    try {
      await db
        .update(chatConversations)
        .set({ archivedAt: new Date() })
        .where(eq(chatConversations.id, conversationId));

      logger.info("Archived conversation", { conversationId });
    } catch (error) {
      logger.error("Error archiving conversation", { error, conversationId });
      throw error;
    }
  }

  /**
   * Unarchive conversation
   */
  static async unarchiveConversation(conversationId: string): Promise<void> {
    try {
      await db
        .update(chatConversations)
        .set({ archivedAt: null })
        .where(eq(chatConversations.id, conversationId));

      logger.info("Unarchived conversation", { conversationId });
    } catch (error) {
      logger.error("Error unarchiving conversation", {
        error,
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Auto-archive old conversations (older than 90 days)
   */
  static async autoArchiveOldConversations(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await db
        .update(chatConversations)
        .set({ archivedAt: new Date() })
        .where(
          and(
            sql`${chatConversations.updatedAt} < ${ninetyDaysAgo}`,
            sql`${chatConversations.archivedAt} IS NULL`,
            sql`${chatConversations.deletedAt} IS NULL`
          )
        );

      const count = result.rowCount ?? 0;
      logger.info("Auto-archived old conversations", { count });
      return count;
    } catch (error) {
      logger.error("Error auto-archiving conversations", { error });
      throw error;
    }
  }

  /**
   * Permanently delete conversations deleted more than 30 days ago
   */
  static async permanentlyDeleteOldConversations(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await db
        .delete(chatConversations)
        .where(
          and(
            sql`${chatConversations.deletedAt} IS NOT NULL`,
            sql`${chatConversations.deletedAt} < ${thirtyDaysAgo}`
          )
        );

      const count = result.rowCount ?? 0;
      logger.info("Permanently deleted old conversations", { count });
      return count;
    } catch (error) {
      logger.error("Error permanently deleting conversations", { error });
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(
    userId: string,
    organizationId?: string
  ): Promise<{
    active: number;
    archived: number;
    deleted: number;
    total: number;
  }> {
    try {
      const conditions = [eq(chatConversations.userId, userId)];

      if (organizationId) {
        conditions.push(eq(chatConversations.organizationId, organizationId));
      }

      const [stats] = await db
        .select({
          active: sql<number>`COUNT(*) FILTER (WHERE ${chatConversations.deletedAt} IS NULL AND ${chatConversations.archivedAt} IS NULL)`,
          archived: sql<number>`COUNT(*) FILTER (WHERE ${chatConversations.archivedAt} IS NOT NULL AND ${chatConversations.deletedAt} IS NULL)`,
          deleted: sql<number>`COUNT(*) FILTER (WHERE ${chatConversations.deletedAt} IS NOT NULL)`,
          total: sql<number>`COUNT(*)`,
        })
        .from(chatConversations)
        .where(and(...conditions));

      return {
        active: Number(stats.active),
        archived: Number(stats.archived),
        deleted: Number(stats.deleted),
        total: Number(stats.total),
      };
    } catch (error) {
      logger.error("Error getting conversation stats", {
        error,
        userId,
        organizationId,
      });
      throw error;
    }
  }
}

