import { getBetterAuthSession } from "@/lib/better-auth-session";
import { createSafeActionErrorResponse, createSafeErrorResponse } from "@/lib/safe-error-response";
import { KnowledgeBaseBrowserService } from "@/server/services/knowledge-base-browser.service";
import { AgentConfigService } from "@/server/services/agent-config.service";
import type { NextRequest } from "next/server";

/**
 * POST /api/agent/knowledge-base/reindex
 * Re-index a document (if it exists in database)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getBetterAuthSession();

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

    // Re-index document
    const result = await KnowledgeBaseBrowserService.reindexDocument(
      documentId,
      organizationId
    );

    if (result.isErr()) {
      return createSafeActionErrorResponse(
        result.error,
        "POST /api/agent/knowledge-base/reindex"
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return createSafeErrorResponse(
      error,
      "POST /api/agent/knowledge-base/reindex"
    );
  }
}

