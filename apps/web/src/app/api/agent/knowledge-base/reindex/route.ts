import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { KnowledgeBaseBrowserService } from "@/server/services/knowledge-base-browser.service";
import type { NextRequest } from "next/server";

/**
 * POST /api/agent/knowledge-base/reindex
 * Re-index a document (if it exists in database)
 */
export async function POST(request: NextRequest) {
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
      logger.error("Failed to re-index document", {
        component: "api/agent/knowledge-base/reindex",
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
    logger.error("Unexpected error re-indexing document", {
      component: "api/agent/knowledge-base/reindex",
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

