import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { createSafeActionErrorResponse } from "@/lib/safe-error-response";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { ProjectService } from "@/server/services/project.service";
import { RAGService } from "@/server/services/rag/rag.service";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const indexRequestSchema = z.object({
  projectId: z.string().uuid(),
  force: z.boolean().optional().default(false), // Force re-indexing
});

/**
 * POST /api/embeddings/index
 * Trigger indexing of a project's content
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getBetterAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user ||
      !authResult.value.organization
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = authResult.value;

    // Parse request body
    const body = await request.json();
    const validationResult = indexRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error },
        { status: 400 }
      );
    }

    const { projectId } = validationResult.data;

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
        "api/embeddings/index"
      );
    } catch {
      // Return 404 to prevent information leakage
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Trigger indexing
    logger.info("Starting manual indexing", { projectId, userId: user.id });

    const ragService = new RAGService();
    const indexResult = await ragService.indexProject(
      projectId,
      organization.id
    );

    if (indexResult.isErr()) {
      return createSafeActionErrorResponse(
        indexResult.error,
        "POST /api/embeddings/index"
      );
    }

    const { indexed, failed } = indexResult.value;

    return NextResponse.json({
      success: true,
      message: "Indexing completed",
      indexed,
      failed,
    });
  } catch (error) {
    logger.error("Error in embeddings index API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

