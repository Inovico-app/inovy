import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { DataExportsQueries } from "@/server/data-access/data-exports.queries";
import { GdprExportService } from "@/server/services/gdpr-export.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const exportIdSchema = z.object({
  exportId: z.string().uuid(),
});

export async function GET(
  request: Request,
  props: { params: Promise<{ exportId: string }> }
) {
  const params = await props.params;
  try {
    // Validate exportId format
    const validationResult = exportIdSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid export ID format" },
        { status: 400 }
      );
    }

    const { exportId } = validationResult.data;

    // Authenticate
    const sessionResult = await getAuthSession();
    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionResult.value.user?.id;
    const organizationId = sessionResult.value.organization?.id;

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: "User or organization not found" },
        { status: 401 }
      );
    }

    // Get export and verify ownership
    const exportResult = await GdprExportService.getExportById(
      exportId,
      userId,
      organizationId
    );

    if (exportResult.isErr()) {
      const error = exportResult.error;
      if (error.code === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Export not found" },
          { status: 404 }
        );
      }
      if (error.code === "FORBIDDEN") {
        return NextResponse.json(
          { error: "You do not have access to this export" },
          { status: 403 }
        );
      }
      if (error.code === "BAD_REQUEST") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json(
        { error: "Failed to get export" },
        { status: 500 }
      );
    }

    const export_ = exportResult.value;

    // Verify export is completed
    if (export_.status !== "completed") {
      return NextResponse.json(
        { error: `Export is ${export_.status}` },
        { status: 400 }
      );
    }

    // Retrieve file data from database
    const fileData = await DataExportsQueries.getExportFileData(exportId);

    if (!fileData) {
      return NextResponse.json(
        { error: "Export file not found" },
        { status: 404 }
      );
    }

    // Stream file data as response
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const fileDataArray = new Uint8Array(fileData);
    return new NextResponse(fileDataArray, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="export-${exportId}.zip"`,
        "Content-Length":
          export_.fileSize?.toString() ?? fileData.length.toString(),
      },
    });
  } catch (error) {
    logger.error("Export download error", {
      component: "GET /api/gdpr-export/[exportId]",
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

