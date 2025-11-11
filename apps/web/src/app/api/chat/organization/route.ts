import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { canAccessOrganizationChat } from "@/lib/rbac";
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

export async function POST(request: NextRequest) {
  const metadata = getRequestMetadata(request);

  try {
    // Get authenticated session with roles
    const sessionResult = await getAuthSession();

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
    const orgCode = organization.orgCode;

    if (!orgCode) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to access organization-level chat
    const hasAccess = canAccessOrganizationChat(user);

    // Log access attempt
    await ChatAuditService.logChatAccess({
      userId: user.id,
      organizationId: orgCode,
      chatContext: "organization",
      granted: hasAccess,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        userRoles: user.roles,
        endpoint: "POST /api/chat/organization",
      },
    });

    if (!hasAccess) {
      logger.warn("Organization chat access denied", {
        userId: user.id,
        organizationId: orgCode,
        userRoles: user.roles,
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

    // Log the query
    await ChatAuditService.logChatQuery({
      userId: user.id,
      organizationId: orgCode,
      chatContext: "organization",
      query: message,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    // Create or get conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const conversationResult =
        await ChatService.createOrganizationConversation(user.id, orgCode);

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
      orgCode
    );

    if (streamResult.isErr()) {
      logger.error("Failed to stream organization response", {
        error: streamResult.error,
      });
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }

    // Return the streaming response with conversation ID in header
    const response = streamResult.value.stream;

    // Clone the response to add custom headers
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
}

// GET endpoint to retrieve conversation history
export async function GET(request: NextRequest) {
  const metadata = getRequestMetadata(request);

  try {
    // Get authenticated session with roles
    const sessionResult = await getAuthSession();

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
    const orgCode = organization.orgCode;

    if (!orgCode) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to access organization-level chat
    const hasAccess = canAccessOrganizationChat(user);

    // Log access attempt
    await ChatAuditService.logChatAccess({
      userId: user.id,
      organizationId: orgCode,
      chatContext: "organization",
      granted: hasAccess,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        userRoles: user.roles,
        endpoint: "GET /api/chat/organization",
      },
    });

    if (!hasAccess) {
      logger.warn("Organization chat access denied", {
        userId: user.id,
        organizationId: orgCode,
        userRoles: user.roles,
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
    const historyResult = await ChatService.getConversationHistory(
      conversationId
    );

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

