import { db } from "@/server/db";
import {
  chatConversations,
  type ChatConversation,
  type NewChatConversation,
} from "@/server/db/schema/chat-conversations";
import {
  chatMessages,
  type ChatMessage,
  type NewChatMessage,
} from "@/server/db/schema/chat-messages";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export class ChatQueries {
  static async createConversation(
    conversation: NewChatConversation
  ): Promise<ChatConversation> {
    const [result] = await db
      .insert(chatConversations)
      .values(conversation)
      .returning();
    return result;
  }
  static async getConversationById(
    conversationId: string
  ): Promise<ChatConversation | null> {
    const [result] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);
    return result || null;
  }
  static async getConversationsByProjectId(
    projectId: string,
    userId: string
  ): Promise<ChatConversation[]> {
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
  }
  static async getConversationsByOrganizationId(
    organizationId: string,
    userId: string
  ): Promise<ChatConversation[]> {
    return await db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.organizationId, organizationId),
          eq(chatConversations.userId, userId),
          sql`${chatConversations.projectId} IS NULL`
        )
      )
      .orderBy(desc(chatConversations.updatedAt));
  }
  static async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    await db
      .update(chatConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));
  }
  static async createMessage(message: NewChatMessage): Promise<ChatMessage> {
    const [result] = await db.insert(chatMessages).values(message).returning();
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, message.conversationId));
    return result;
  }
  static async getMessagesByConversationId(
    conversationId: string
  ): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }
  static async getMessagesByConversationIds(
    conversationIds: string[]
  ): Promise<ChatMessage[]> {
    if (conversationIds.length === 0) {
      return [];
    }
    return await db
      .select()
      .from(chatMessages)
      .where(inArray(chatMessages.conversationId, conversationIds))
      .orderBy(chatMessages.createdAt);
  }
  static async deleteConversation(conversationId: string): Promise<void> {
    await db
      .delete(chatConversations)
      .where(eq(chatConversations.id, conversationId));
  }
  static async getConversationsWithPagination(params: {
    userId: string;
    organizationId?: string;
    projectId?: string;
    context?: "project" | "organization";
    filter?: "all" | "active" | "archived" | "deleted";
    page?: number;
    limit?: number;
  }): Promise<{ conversations: ChatConversation[]; total: number }> {
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
    const conditions = [eq(chatConversations.userId, userId)];
    conditions.push(
      sql`(${chatConversations.deletedAt} IS NULL OR ${chatConversations.deletedAt} > ${thirtyDaysAgo})`
    );
    if (organizationId)
      conditions.push(eq(chatConversations.organizationId, organizationId));
    if (context === "project" && projectId)
      conditions.push(eq(chatConversations.projectId, projectId));
    else if (context === "organization")
      conditions.push(sql`${chatConversations.projectId} IS NULL`);
    if (filter === "active") {
      conditions.push(sql`${chatConversations.deletedAt} IS NULL`);
      conditions.push(sql`${chatConversations.archivedAt} IS NULL`);
    } else if (filter === "archived") {
      conditions.push(sql`${chatConversations.archivedAt} IS NOT NULL`);
      conditions.push(sql`${chatConversations.deletedAt} IS NULL`);
    } else if (filter === "deleted") {
      conditions.push(sql`${chatConversations.deletedAt} IS NOT NULL`);
    }
    const conversations = await db
      .select()
      .from(chatConversations)
      .where(and(...conditions))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatConversations)
      .where(and(...conditions));
    return { conversations, total: Number(count) };
  }
  static async searchConversations(params: {
    userId: string;
    query: string;
    organizationId?: string;
    projectId?: string;
    context?: "project" | "organization";
    limit?: number;
  }): Promise<ChatConversation[]> {
    const {
      userId,
      query,
      organizationId,
      projectId,
      context,
      limit = 20,
    } = params;
    const conditions = [
      eq(chatConversations.userId, userId),
      sql`${chatConversations.deletedAt} IS NULL`,
      sql`${chatConversations.title} ILIKE ${`%${query}%`}`,
    ];
    if (organizationId)
      conditions.push(eq(chatConversations.organizationId, organizationId));
    if (context === "project" && projectId)
      conditions.push(eq(chatConversations.projectId, projectId));
    else if (context === "organization")
      conditions.push(sql`${chatConversations.projectId} IS NULL`);
    return await db
      .select()
      .from(chatConversations)
      .where(and(...conditions))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit);
  }
  static async softDeleteConversation(conversationId: string): Promise<void> {
    await db
      .update(chatConversations)
      .set({ deletedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));
  }
  static async restoreConversation(conversationId: string): Promise<boolean> {
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);
    if (!conversation || !conversation.deletedAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (conversation.deletedAt < thirtyDaysAgo) return false;
    await db
      .update(chatConversations)
      .set({ deletedAt: null })
      .where(eq(chatConversations.id, conversationId));
    return true;
  }
  static async archiveConversation(conversationId: string): Promise<void> {
    await db
      .update(chatConversations)
      .set({ archivedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));
  }
  static async unarchiveConversation(conversationId: string): Promise<void> {
    await db
      .update(chatConversations)
      .set({ archivedAt: null })
      .where(eq(chatConversations.id, conversationId));
  }
  static async autoArchiveOldConversations(): Promise<number> {
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
    return result.rowCount ?? 0;
  }
  static async permanentlyDeleteOldConversations(): Promise<number> {
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
    return result.rowCount ?? 0;
  }
  static async getConversationStats(
    userId: string,
    organizationId?: string
  ): Promise<{
    active: number;
    archived: number;
    deleted: number;
    total: number;
  }> {
    const conditions = [eq(chatConversations.userId, userId)];
    if (organizationId)
      conditions.push(eq(chatConversations.organizationId, organizationId));
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
  }

  /**
   * Delete all conversations for a user in an organization
   */
  static async deleteByUserIdAndOrganizationId(
    userId: string,
    organizationId: string
  ): Promise<void> {
    await db
      .delete(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId)
        )
      );
  }
}

