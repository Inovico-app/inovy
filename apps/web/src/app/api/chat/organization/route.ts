import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { canAccessOrganizationChat } from "@/lib/rbac/rbac";
import { GuardrailError } from "@/server/ai/middleware";
import { moderateUserInput } from "@/server/ai/middleware/input-moderation.middleware";
import { ChatAuditService } from "@/server/services/chat-audit.service";
import { ChatService } from "@/server/services/chat.service";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

/**
 * Extract request metadata for audit logging
 */
function getRequestMetadata(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };
}

export const POST = withRateLimit(
  async (request: NextRequest) => {
    const metadata = getRequestMetadata(request);

    try {
      // Get authenticated session with roles
      const sessionResult = await getBetterAuthSession();

      if (sessionResult.isErr()) {
        logger.error("Failed to get auth session", {
          error: sessionResult.error,
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const session = sessionResult.value;

      if (!session.isAuthenticated || !session.user || !session.organization) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { user, organization } = session;
      const organizationId = organization.id;

      // Check if user has permission to access organization-level chat
      const hasAccess = canAccessOrganizationChat(user);

      // Log access attempt
      await ChatAuditService.logChatAccess({
        organizationId,
        userId: user.id,
        chatContext: "organization",
        granted: hasAccess,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: {
          userRole: user.role,
          endpoint: "POST /api/chat/organization",
        },
      });

      if (!hasAccess) {
        logger.warn("Organization chat access denied", {
          organizationId,
          userId: user.id,
          userRole: user.role,
        });

        return NextResponse.json(
          {
            error: "Forbidden",
            message:
              "Organization-level chat requires administrator privileges",
            requiredRole: "admin",
          },
          { status: 403 }
        );
      }

      // Parse request body
      const body = await request.json();
      const validationResult = chatRequestSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid request", details: validationResult.error },
          { status: 400 }
        );
      }

      const { message, conversationId } = validationResult.data;

      // Run moderation before logging query; do not persist blocked content
      try {
        await moderateUserInput(message);
      } catch (err) {
        if (err instanceof GuardrailError) {
          const categories = (err.violation.details?.categories ?? []) as string[];
          await ChatAuditService.logModerationBlocked({
            userId: user.id,
            organizationId,
            chatContext: "organization",
            flaggedCategories: categories,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          });
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }

      // Log the query (only after moderation passes)
      await ChatAuditService.logChatQuery({
        userId: user.id,
        organizationId,
        chatContext: "organization",
        query: message,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Create or get conversation
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const conversationResult =
          await ChatService.createOrganizationConversation(
            user.id,
            organizationId
          );

        if (conversationResult.isErr()) {
          logger.error("Failed to create organization conversation", {
            error: conversationResult.error,
          });
          return NextResponse.json(
            { error: "Failed to create conversation" },
            { status: 500 }
          );
        }

        activeConversationId = conversationResult.value.conversationId;
      }

      // Stream the response
      const streamResult = await ChatService.streamOrganizationResponse(
        activeConversationId,
        message,
        organizationId
      );

      if (streamResult.isErr()) {
        const err = streamResult.error;
        if (err instanceof GuardrailError) {
          // Moderation runs before stream; this handles other guards (PII, injection, topic)
          const categories = (err.violation.details?.categories ?? []) as string[];
          await ChatAuditService.logModerationBlocked({
            userId: user.id,
            organizationId,
            chatContext: "organization",
            flaggedCategories: categories,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          });
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        logger.error("Failed to stream organization response", {
          error: err,
        });
        return NextResponse.json(
          { error: "Failed to generate response" },
          { status: 500 }
        );
      }

      // Return the streaming response with conversation ID in header
      const response = streamResult.value.stream;

      // Clone the response to add custom headers
      // Note: Rate limit headers are automatically added by withRateLimit wrapper
      const headers = new Headers(response.headers);
      headers.set("X-Conversation-Id", activeConversationId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      logger.error("Error in organization chat API", { error });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  },
  {
    maxRequests: undefined, // Use tier-based default (100 req/hour free, 1000 req/hour pro)
    windowSeconds: 3600, // 1 hour
  }
);

// GET endpoint to retrieve conversation history
export async function GET(request: NextRequest) {
  const metadata = getRequestMetadata(request);

  try {
    // Get authenticated session with roles
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr()) {
      logger.error("Failed to get auth session", {
        error: sessionResult.error,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = sessionResult.value;

    if (!session.isAuthenticated || !session.user || !session.organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = session;
    const organizationId = organization.id;

    // Check if user has permission to access organization-level chat
    const hasAccess = canAccessOrganizationChat(user);

    // Log access attempt
    await ChatAuditService.logChatAccess({
      organizationId,
      userId: user.id,
      chatContext: "organization",
      granted: hasAccess,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        userRole: user.role,
        endpoint: "GET /api/chat/organization",
      },
    });

    if (!hasAccess) {
      logger.warn("Organization chat access denied", {
        organizationId,
        userId: user.id,
        userRole: user.role,
      });

      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Organization-level chat requires administrator privileges",
          requiredRole: "admin",
        },
        { status: 403 }
      );
    }

    // Get conversation ID from query params
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Get conversation history
    const historyResult =
      await ChatService.getConversationHistory(conversationId);

    if (historyResult.isErr()) {
      logger.error("Failed to get conversation history", {
        error: historyResult.error,
      });
      return NextResponse.json(
        { error: "Failed to get conversation history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: historyResult.value });
  } catch (error) {
    logger.error("Error getting organization conversation history", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

