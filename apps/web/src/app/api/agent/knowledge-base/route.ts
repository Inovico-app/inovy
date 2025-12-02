import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { KnowledgeBaseBrowserService } from "@/server/services/knowledge-base-browser.service";
import { AgentConfigService } from "@/server/services/agent-config.service";
import type { NextRequest } from "next/server";

/**
 * GET /api/agent/knowledge-base
 * List indexed documents with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.organization
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = authResult.value.organization.id;

    // Check if agent is enabled for this organization
    const agentStatusResult = await AgentConfigService.isAgentEnabled(
      organizationId
    );

    if (agentStatusResult.isErr() || !agentStatusResult.value) {
      return Response.json(
        {
          error: "Agent is disabled for this organization",
          code: "AGENT_DISABLED",
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId") || undefined;
    const contentType = searchParams.get("contentType") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = searchParams.get("offset") || null;

    // List documents
    const result = await KnowledgeBaseBrowserService.listDocuments({
      organizationId,
      projectId,
      contentType,
      search,
      limit,
      offset: offset || undefined,
    });

    if (result.isErr()) {
      logger.error("Failed to list documents", {
        component: "api/agent/knowledge-base",
        error: result.error.message,
      });
      return Response.json(
        { error: result.error.message },
        { status: result.error.code === "INTERNAL_SERVER_ERROR" ? 500 : 400 }
      );
    }

    return Response.json(result.value);
  } catch (error) {
    logger.error("Unexpected error listing documents", {
      component: "api/agent/knowledge-base",
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/knowledge-base
 * Delete a document by documentId
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.organization
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = authResult.value.organization.id;

    // Check if agent is enabled for this organization
    const agentStatusResult = await AgentConfigService.isAgentEnabled(
      organizationId
    );

    if (agentStatusResult.isErr() || !agentStatusResult.value) {
      return Response.json(
        {
          error: "Agent is disabled for this organization",
          code: "AGENT_DISABLED",
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const documentId = body.documentId;

    if (!documentId || typeof documentId !== "string") {
      return Response.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Delete document
    const result = await KnowledgeBaseBrowserService.deleteDocument(
      documentId,
      organizationId
    );

    if (result.isErr()) {
      logger.error("Failed to delete document", {
        component: "api/agent/knowledge-base",
        documentId,
        error: result.error.message,
      });
      return Response.json(
        { error: result.error.message },
        { status: result.error.code === "INTERNAL_SERVER_ERROR" ? 500 : 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Unexpected error deleting document", {
      component: "api/agent/knowledge-base",
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

