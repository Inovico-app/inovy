import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger, serializeError } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { canAccessOrganizationChat } from "@/lib/rbac/rbac";
import { GuardrailError } from "@/server/ai/middleware";
import { moderateUserInput } from "@/server/ai/middleware/input-moderation.middleware";
import { AgentConfigService } from "@/server/services/agent-config.service";
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

const assistantMessagePartSchema = z.looseObject({
  type: z.string(),
});

const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.literal("assistant"),
  parts: z.array(assistantMessagePartSchema),
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
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = sessionResult.value;

    if (!session.user || !session.organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = session;
    const organizationId = organization.id;

    // Check if agent is enabled for this organization
    const agentStatusResult =
      await AgentConfigService.isAgentEnabled(organizationId);

    if (agentStatusResult.isErr() || !agentStatusResult.value) {
      return NextResponse.json(
        {
          error: "Agent is disabled for this organization",
          code: "AGENT_DISABLED",
        },
        { status: 403 }
      );
    }

    // Check rate limit (100 req/hour free, 1000 req/hour pro)
    const rateLimitResult = await checkRateLimit(user.id, {
      maxRequests: undefined, // Use tier-based default
      windowSeconds: 3600, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
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
        organizationId: organizationId,
        chatContext: "organization",
        granted: hasAccess,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: {
          userRole: user.role,
          endpoint: "POST /api/chat (organization)",
        },
      });

      if (!hasAccess) {
        logger.warn("Organization chat access denied", {
          userId: user.id,
          organizationId: organizationId,
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

      // Run moderation before logging query; do not persist blocked content
      if (context === "organization") {
        try {
          await moderateUserInput(lastUserMessage);
        } catch (err) {
          if (err instanceof GuardrailError) {
            const categories = (err.violation.details?.categories ??
              []) as string[];
            if (
              err.violation.type === "moderation" &&
              Array.isArray(categories) &&
              categories.length > 0
            ) {
              await ChatAuditService.logModerationBlocked({
                userId: user.id,
                organizationId: organizationId,
                chatContext: "organization",
                flaggedCategories: categories,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
              });
            }
            return NextResponse.json({ error: err.message }, { status: 400 });
          }
          throw err;
        }
      }

      // Log the query (only after moderation passes for org context)
      if (context === "organization") {
        await ChatAuditService.logChatQuery({
          userId: user.id,
          organizationId: organizationId,
          chatContext: "organization",
          query: lastUserMessage,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        });
      }

      // Create or get conversation
      let activeConversationId = conversationId;

      if (context === "organization" && !activeConversationId) {
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

      if (!activeConversationId) {
        return NextResponse.json(
          { error: "Conversation ID required" },
          { status: 400 }
        );
      }

      // Stream the response
      const streamResult = await ChatService.streamOrganizationResponse(
        activeConversationId,
        lastUserMessage,
        organizationId
      );

      if (streamResult.isErr()) {
        const err = streamResult.error;
        if (err instanceof GuardrailError) {
          const categories = (err.violation.details?.categories ??
            []) as string[];
          if (
            err.violation.type === "moderation" &&
            Array.isArray(categories) &&
            categories.length > 0
          ) {
            await ChatAuditService.logModerationBlocked({
              userId: user.id,
              organizationId,
              chatContext: "organization",
              flaggedCategories: categories,
              ipAddress: metadata.ipAddress,
              userAgent: metadata.userAgent,
            });
          }
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
      const headers = new Headers(response.headers);
      headers.set("X-Conversation-Id", activeConversationId);
      headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
      headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString()
      );
      headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimitResult.resetAt).toISOString()
      );

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

      try {
        assertOrganizationAccess(
          project.organizationId,
          organizationId,
          "api/chat/POST"
        );
      } catch (error) {
        // Return 404 to prevent information leakage
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Create or get conversation
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const conversationResult = await ChatService.createConversation(
          projectId,
          user.id,
          organizationId
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
        projectId,
        organizationId
      );

      if (streamResult.isErr()) {
        const err = streamResult.error;
        if (err instanceof GuardrailError) {
          const categories = (err.violation.details?.categories ??
            []) as string[];
          if (
            err.violation.type === "moderation" &&
            Array.isArray(categories) &&
            categories.length > 0
          ) {
            await ChatAuditService.logModerationBlocked({
              userId: user.id,
              organizationId,
              chatContext: "project",
              projectId,
              flaggedCategories: categories,
              ipAddress: metadata.ipAddress,
              userAgent: metadata.userAgent,
            });
          }
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        logger.error("Failed to stream response", {
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
      const headers = new Headers(response.headers);
      headers.set("X-Conversation-Id", activeConversationId);
      headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
      headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString()
      );
      headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimitResult.resetAt).toISOString()
      );

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  } catch (error) {
    logger.error("Error in unified chat API", {
      error: serializeError(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

