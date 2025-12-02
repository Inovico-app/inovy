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
  static async updateConversationSummary(
    conversationId: string,
    summary: string
  ): Promise<void> {
    await db
      .update(chatConversations)
      .set({ summary, updatedAt: new Date() })
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
  }): Promise<{
    conversations: (ChatConversation & { lastMessage?: string | null })[];
    total: number;
  }> {
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

    // Get conversations with last message using a derived table approach
    // First get the conversations, then join with last messages
    const conversationIds = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(and(...conditions))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit)
      .offset(offset);

    if (conversationIds.length === 0) {
      return { conversations: [], total: 0 };
    }

    const ids = conversationIds.map((c) => c.id);

    // Get last message for each conversation using DISTINCT ON
    // Use proper parameter binding for PostgreSQL array
    // When ids is a single element, ensure it's still treated as an array
    const lastMessages = await db.execute(
      sql`
        SELECT DISTINCT ON (conversation_id) 
          conversation_id,
          content
        FROM ${chatMessages}
        WHERE conversation_id = ANY(ARRAY[${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `
        )}]::uuid[])
        ORDER BY conversation_id, created_at DESC
      `
    );

    const lastMessageMap = new Map<string, string>();
    for (const row of lastMessages.rows as Array<{
      conversation_id: string;
      content: string;
    }>) {
      lastMessageMap.set(row.conversation_id, row.content);
    }

    // Get full conversation data
    const conversations = await db
      .select()
      .from(chatConversations)
      .where(inArray(chatConversations.id, ids))
      .orderBy(desc(chatConversations.updatedAt));

    // Map last messages to conversations
    const conversationsWithLastMessage = conversations.map((conv) => ({
      ...conv,
      lastMessage: lastMessageMap.get(conv.id) ?? null,
    }));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatConversations)
      .where(and(...conditions));
    return {
      conversations: conversationsWithLastMessage,
      total: Number(count),
    };
  }
  static async searchConversations(params: {
    userId: string;
    query: string;
    organizationId?: string;
    projectId?: string;
    context?: "project" | "organization";
    limit?: number;
  }): Promise<(ChatConversation & { lastMessage?: string | null })[]> {
    const {
      userId,
      query,
      organizationId,
      projectId,
      context,
      limit = 20,
    } = params;
    const searchPattern = `%${query}%`;
    const baseConditions = [
      eq(chatConversations.userId, userId),
      sql`${chatConversations.deletedAt} IS NULL`,
    ];
    if (organizationId)
      baseConditions.push(eq(chatConversations.organizationId, organizationId));
    if (context === "project" && projectId)
      baseConditions.push(eq(chatConversations.projectId, projectId));
    else if (context === "organization")
      baseConditions.push(sql`${chatConversations.projectId} IS NULL`);

    // Search in both title and message content
    // Get conversations matching title
    const titleMatches = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          ...baseConditions,
          sql`${chatConversations.title} ILIKE ${searchPattern}`
        )
      );

    // Get conversation IDs that have matching message content
    // Build conditions for content search
    const contentSearchConditions = [
      sql`cm.content ILIKE ${searchPattern}`,
      sql`cc.user_id = ${userId}`,
      sql`cc.deleted_at IS NULL`,
    ];
    if (organizationId) {
      contentSearchConditions.push(sql`cc.organization_id = ${organizationId}`);
    }
    if (context === "project" && projectId) {
      contentSearchConditions.push(sql`cc.project_id = ${projectId}`);
    } else if (context === "organization") {
      contentSearchConditions.push(sql`cc.project_id IS NULL`);
    }

    const contentMatchResult = await db.execute(
      sql`
        SELECT DISTINCT cm.conversation_id as id
        FROM ${chatMessages} cm
        INNER JOIN ${chatConversations} cc ON cm.conversation_id = cc.id
        WHERE ${sql.join(contentSearchConditions, sql` AND `)}
      `
    );

    // Combine IDs from both searches
    const allMatchIds = new Set<string>();
    titleMatches.forEach((c) => allMatchIds.add(c.id));
    (contentMatchResult.rows as Array<{ id: string }>).forEach((row) =>
      allMatchIds.add(row.id)
    );

    if (allMatchIds.size === 0) {
      return [];
    }

    const ids = Array.from(allMatchIds);

    // Get full conversation data
    const matchingConversations = await db
      .select()
      .from(chatConversations)
      .where(inArray(chatConversations.id, ids))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(limit);

    // Get last message for each conversation using DISTINCT ON
    // Use proper parameter binding for PostgreSQL array
    // When ids is a single element, ensure it's still treated as an array
    const lastMessages = await db.execute(
      sql`
        SELECT DISTINCT ON (conversation_id) 
          conversation_id,
          content
        FROM ${chatMessages}
        WHERE conversation_id = ANY(ARRAY[${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `
        )}]::uuid[])
        ORDER BY conversation_id, created_at DESC
      `
    );

    const lastMessageMap = new Map<string, string>();
    for (const row of lastMessages.rows as Array<{
      conversation_id: string;
      content: string;
    }>) {
      lastMessageMap.set(row.conversation_id, row.content);
    }

    // Map last messages to conversations
    return matchingConversations.map((conv) => ({
      ...conv,
      lastMessage: lastMessageMap.get(conv.id) ?? null,
    }));
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

