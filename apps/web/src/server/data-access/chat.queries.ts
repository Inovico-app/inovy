import { db } from "@/server/db";
import {
  chatConversations,
  chatMessages,
  type NewChatConversation,
  type NewChatMessage,
  type ChatConversation,
  type ChatMessage,
} from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

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
      const [result] = await db.insert(chatMessages).values(message).returning();

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
}

