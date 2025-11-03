import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { EmbeddingService } from "@/server/services/embedding.service";
import { ProjectService } from "@/server/services/project.service";
import { logger } from "@/lib/logger";
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
    const { getUser, getOrganization } = getKindeServerSession();
    const user = await getUser();
    const organization = await getOrganization();

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (project.organizationId !== organization.orgCode) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Trigger indexing
    logger.info("Starting manual indexing", { projectId, userId: user.id });

    const indexResult = await EmbeddingService.indexProject(
      projectId,
      organization.orgCode
    );

    if (indexResult.isErr()) {
      logger.error("Indexing failed", { error: indexResult.error, projectId });
      return NextResponse.json(
        { error: "Indexing failed", details: indexResult.error.message },
        { status: 500 }
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

