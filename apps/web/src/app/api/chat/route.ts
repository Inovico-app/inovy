import { getAuthSessionWithRoles } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { canAccessOrganizationChat } from "@/lib/rbac";
import { ChatAuditService } from "@/server/services/chat-audit.service";
import { ChatService } from "@/server/services/chat.service";
import { ProjectService } from "@/server/services/project.service";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const userMessageSchema = z.object({
  role: z.literal("user"),
  parts: z.array(
    z.object({
      type: z.enum(["text", "image"]),
      text: z.string().optional(),
      image: z.string().optional(),
    })
  ),
  id: z.string(),
});

const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.literal("assistant"),
  parts: z.array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("step-start") }),
      z.object({
        type: z.literal("text"),
        text: z.string(),
        state: z.literal("done"),
        providerMetadata: z.object({
          openai: z.object({ itemId: z.string() }),
        }),
      }),
    ])
  ),
});

const chatRequestSchema = z.object({
  context: z.enum(["project", "organization"]),
  projectId: z.uuid().optional(),
  id: z.string(),
  messages: z.array(z.union([userMessageSchema, assistantMessageSchema])),
  conversationId: z.uuid().optional(),
  trigger: z.string().optional(),
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
    const sessionResult = await getAuthSessionWithRoles();

    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = sessionResult.value;

    if (!session.user || !session.organization) {
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

    // Parse request body
    const body = await request.json();

    const validationResult = chatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error },
        { status: 400 }
      );
    }

    const { messages, context, projectId, conversationId } =
      validationResult.data;

    // Get the last user message
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()
      ?.parts.map((p) => p.text)
      .join(" ");

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }

    // Validate context-specific requirements
    if (context === "organization") {
      // Check if user has access to organization chat
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
          endpoint: "POST /api/chat (organization)",
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
            message:
              "Organization-level chat requires administrator privileges",
            requiredRole: "admin",
          },
          { status: 403 }
        );
      }

      // Log the query
      await ChatAuditService.logChatQuery({
        userId: user.id,
        organizationId: orgCode,
        chatContext: "organization",
        query: lastUserMessage,
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
        lastUserMessage,
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
    } else {
      // Project context
      if (!projectId) {
        return NextResponse.json(
          { error: "Project ID is required for project context" },
          { status: 400 }
        );
      }

      // Verify user has access to the project
      const projectResult = await ProjectService.getProjectById(projectId);
      if (projectResult.isErr()) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      const project = projectResult.value;
      if (project.organizationId !== orgCode) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Create or get conversation
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const conversationResult = await ChatService.createConversation(
          projectId,
          user.id,
          orgCode
        );

        if (conversationResult.isErr()) {
          logger.error("Failed to create conversation", {
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
      const streamResult = await ChatService.streamResponse(
        activeConversationId,
        lastUserMessage,
        projectId
      );

      if (streamResult.isErr()) {
        logger.error("Failed to stream response", {
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
    }
  } catch (error) {
    logger.error("Error in unified chat API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

