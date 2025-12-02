import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { KnowledgeBaseBrowserService } from "@/server/services/knowledge-base-browser.service";
import type { NextRequest } from "next/server";

/**
 * GET /api/agent/knowledge-base/preview
 * Get document preview with sample chunks
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("documentId");
    const sampleSize = parseInt(searchParams.get("sampleSize") || "5", 10);

    if (!documentId) {
      return Response.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Get document preview
    const result = await KnowledgeBaseBrowserService.getDocumentPreview(
      documentId,
      organizationId,
      sampleSize
    );

    if (result.isErr()) {
      logger.error("Failed to get document preview", {
        component: "api/agent/knowledge-base/preview",
        documentId,
        error: result.error.message,
      });
      return Response.json(
        { error: result.error.message },
        { status: result.error.code === "INTERNAL_SERVER_ERROR" ? 500 : 400 }
      );
    }

    return Response.json(result.value);
  } catch (error) {
    logger.error("Unexpected error getting document preview", {
      component: "api/agent/knowledge-base/preview",
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

