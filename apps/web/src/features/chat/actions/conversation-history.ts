"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { ChatService } from "@/server/services/chat.service";
import {
  conversationIdSchema,
  listConversationsSchema,
  searchConversationsSchema,
} from "@/server/validation/chat/conversation-history";
import { revalidatePath } from "next/cache";

export const listConversationsAction = authorizedActionClient
  .metadata({
    name: "list-conversations",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "list",
      category: "read",
    },
  })
  .schema(listConversationsSchema)
  .action(
    async ({
      parsedInput: { context, projectId, filter, page, limit },
      ctx: { user, organizationId },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await ChatService.listConversations({
        userId: user.id,
        organizationId,
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
    },
  );

export const searchConversationsAction = authorizedActionClient
  .metadata({
    name: "search-conversations",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "search",
      category: "read",
    },
  })
  .schema(searchConversationsSchema)
  .action(
    async ({
      parsedInput: { query, context, projectId, limit },
      ctx: { user, organizationId },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await ChatService.searchConversations({
        userId: user.id,
        query,
        organizationId,
        projectId,
        context,
        limit,
      });

      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
  );

export const softDeleteConversationAction = authorizedActionClient
  .metadata({
    name: "soft-delete-conversation",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "delete",
      category: "mutation",
    },
  })
  .schema(conversationIdSchema)
  .action(
    async ({
      parsedInput: { conversationId },
      ctx: { user, organizationId },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.softDeleteConversation(
        conversationId,
        user.id,
        organizationId,
      );

      if (result.isErr()) {
        throw result.error;
      }

      revalidatePath("/chat");
      return { success: true };
    },
  );

export const restoreConversationAction = authorizedActionClient
  .metadata({
    name: "restore-conversation",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "restore",
      category: "mutation",
    },
  })
  .schema(conversationIdSchema)
  .action(
    async ({
      parsedInput: { conversationId },
      ctx: { user, organizationId },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.restoreConversation(
        conversationId,
        user.id,
        organizationId,
      );

      if (result.isErr()) {
        throw result.error;
      }

      if (!result.value) {
        throw new Error(
          "Cannot restore conversation deleted more than 30 days ago",
        );
      }

      revalidatePath("/chat");
      return { success: true, restored: result.value };
    },
  );

export const archiveConversationAction = authorizedActionClient
  .metadata({
    name: "archive-conversation",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "archive",
      category: "mutation",
    },
  })
  .schema(conversationIdSchema)
  .action(
    async ({
      parsedInput: { conversationId },
      ctx: { user, organizationId },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.archiveConversation(
        conversationId,
        user.id,
        organizationId,
      );

      if (result.isErr()) {
        throw result.error;
      }

      revalidatePath("/chat");
      return { success: true };
    },
  );

export const unarchiveConversationAction = authorizedActionClient
  .metadata({
    name: "unarchive-conversation",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "restore",
      category: "mutation",
    },
  })
  .schema(conversationIdSchema)
  .action(
    async ({
      parsedInput: { conversationId },
      ctx: { user, organizationId },
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!organizationId) {
        throw new Error("Organization context required");
      }

      const result = await ChatService.unarchiveConversation(
        conversationId,
        user.id,
        organizationId,
      );

      if (result.isErr()) {
        throw result.error;
      }

      revalidatePath("/chat");
      return { success: true };
    },
  );

export const getConversationStatsAction = authorizedActionClient
  .metadata({
    name: "get-conversation-stats",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "get",
      category: "read",
    },
  })
  .action(async ({ ctx: { user, organizationId } }) => {
    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not authenticated",
        "getConversationStatsAction",
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required", {
        context: "getConversationStatsAction",
        metadata: {
          organizationId,
        },
      });
    }

    const result = await ChatService.getConversationStats(
      user.id,
      organizationId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  });

export const getConversationMessagesAction = authorizedActionClient
  .metadata({
    name: "get-conversation-messages",
    permissions: policyToPermissions("chat:project"),
    audit: {
      resourceType: "chat",
      action: "read",
      category: "read",
    },
  })
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
