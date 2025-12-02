import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { ChatService } from "@/server/services/chat.service";
import { ProjectService } from "@/server/services/project.service";
import { AgentConfigService } from "@/server/services/agent-config.service";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const authResult = await getAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user ||
      !authResult.value.organization
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = authResult.value;

    // Check if agent is enabled for this organization
    const agentStatusResult = await AgentConfigService.isAgentEnabled(
      organization.id
    );

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

    // Verify user has access to the project
    const projectResult = await ProjectService.getProjectById(projectId);
    if (projectResult.isErr()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectResult.value;

    try {
      assertOrganizationAccess(
        project.organizationId,
        organization.id,
        "api/chat/[projectId]"
      );
    } catch (error) {
      // Return 404 to prevent information leakage
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    // Create or get conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const conversationResult = await ChatService.createConversation(
        projectId,
        user.id,
        organization.id
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
      message,
      projectId,
      organization.id
    );

    if (streamResult.isErr()) {
      logger.error("Failed to stream response", { error: streamResult.error });
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
    headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    headers.set(
      "X-RateLimit-Reset",
      new Date(rateLimitResult.resetAt).toISOString()
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    logger.error("Error in chat API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve conversation history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const authResult = await getAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user ||
      !authResult.value.organization
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = authResult.value;

    // Verify user has access to the project
    const projectResult = await ProjectService.getProjectById(projectId);
    if (projectResult.isErr()) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectResult.value;

    try {
      assertOrganizationAccess(
        project.organizationId,
        organization.id,
        "api/chat/[projectId]"
      );
    } catch (error) {
      // Return 404 to prevent information leakage
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    logger.error("Error getting conversation history", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

