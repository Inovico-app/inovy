"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ChatService } from "@/server/services/chat.service";
import {
  conversationIdSchema,
  listConversationsSchema,
  searchConversationsSchema,
} from "@/server/validation/chat/conversation-history";
import { revalidatePath } from "next/cache";

export const listConversationsAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .schema(listConversationsSchema)
  .action(
    async ({
      parsedInput: { context, projectId, filter, page, limit },
      ctx: { user },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await ChatService.listConversations({
        userId: user.id,
        organizationId: user.organization_code,
        projectId,
        context,
        filter,
        page,
        limit,
      });

      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    }
  );

export const searchConversationsAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .schema(searchConversationsSchema)
  .action(
    async ({
      parsedInput: { query, context, projectId, limit },
      ctx: { user },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await ChatService.searchConversations({
        userId: user.id,
        query,
        organizationId: user.organization_code,
        projectId,
        context,
        limit,
      });

      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    }
  );

export const softDeleteConversationAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .schema(conversationIdSchema)
  .action(
    async ({ parsedInput: { conversationId }, ctx: { user, organizationId } }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.softDeleteConversation(
        conversationId,
        user.id,
        organizationId
      );

      if (result.isErr()) {
        throw result.error;
      }

      revalidatePath("/chat");
      return { success: true };
    }
  );

export const restoreConversationAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .schema(conversationIdSchema)
  .action(
    async ({ parsedInput: { conversationId }, ctx: { user, organizationId } }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.restoreConversation(
        conversationId,
        user.id,
        organizationId
      );

      if (result.isErr()) {
        throw result.error;
      }

      if (!result.value) {
        throw new Error(
          "Cannot restore conversation deleted more than 30 days ago"
        );
      }

      revalidatePath("/chat");
      return { success: true, restored: result.value };
    }
  );

export const archiveConversationAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .schema(conversationIdSchema)
  .action(
    async ({ parsedInput: { conversationId }, ctx: { user, organizationId } }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.archiveConversation(
        conversationId,
        user.id,
        organizationId
      );

      if (result.isErr()) {
        throw result.error;
      }

      revalidatePath("/chat");
      return { success: true };
    }
  );

export const unarchiveConversationAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .schema(conversationIdSchema)
  .action(
    async ({ parsedInput: { conversationId }, ctx: { user, organizationId } }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.unarchiveConversation(
        conversationId,
        user.id,
        organizationId
      );

      if (result.isErr()) {
        throw result.error;
      }

      revalidatePath("/chat");
      return { success: true };
    }
  );

export const getConversationStatsAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .action(async ({ ctx: { user } }) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    const result = await ChatService.getConversationStats(
      user.id,
      user.organization_code
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  });

export const getConversationMessagesAction = authorizedActionClient
  .metadata({ policy: "chat:project" })
  .schema(conversationIdSchema)
  .action(async ({ parsedInput: { conversationId }, ctx: { user } }) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    const result = await ChatService.getConversationHistory(conversationId);

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  });

