import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/server/services/chat.service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

/**
 * Check if user is an admin in the organization
 * For now, we'll use a simple approach - this can be extended with proper RBAC
 */
async function isAdminUser(_userId: string, _organizationId: string): Promise<boolean> {
  // TODO: Implement proper admin check using Kinde permissions or database
  // For now, we'll allow all authenticated users in the organization
  // In production, you should check against Kinde roles or a database table
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { getUser, getOrganization } = getKindeServerSession();
    const user = await getUser();
    const organization = await getOrganization();

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgCode = organization.orgCode;

    if (!orgCode) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user is admin
    const isAdmin = await isAdminUser(user.id, orgCode);
    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Organization-level chat is only available to administrators",
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

    // Return the streaming response with conversation ID and sources in headers
    const response = streamResult.value.stream;

    // Clone the response to add custom headers
    const headers = new Headers(response.headers);
    headers.set("X-Conversation-Id", activeConversationId);
    headers.set("X-Sources", JSON.stringify(streamResult.value.sources));

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
  try {
    const { getUser, getOrganization } = getKindeServerSession();
    const user = await getUser();
    const organization = await getOrganization();

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgCode = organization.orgCode;

    if (!orgCode) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user is admin
    const isAdmin = await isAdminUser(user.id, orgCode);
    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Organization-level chat is only available to administrators",
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

