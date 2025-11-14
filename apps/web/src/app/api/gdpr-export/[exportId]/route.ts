import { getAuthSession } from "@/lib/auth";
import { GdprExportService } from "@/server/services/gdpr-export.service";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ exportId: string }> }
) {
  const params = await props.params;
  try {
    // Authenticate
    const sessionResult = await getAuthSession();
    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionResult.value.user?.id;
    const organizationId = sessionResult.value.organization?.orgCode;

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: "User or organization not found" },
        { status: 401 }
      );
    }

    const { exportId } = params;

    // Get export and verify ownership
    const exportResult = await GdprExportService.getExportById(
      exportId,
      userId,
      organizationId
    );

    if (exportResult.isErr()) {
      const error = exportResult.error;
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ error: "Export not found" }, { status: 404 });
      }
      if (error.code === "FORBIDDEN") {
        return NextResponse.json(
          { error: "You do not have access to this export" },
          { status: 403 }
        );
      }
      if (error.code === "BAD_REQUEST") {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
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

    // Verify download URL exists
    if (!export_.downloadUrl) {
      return NextResponse.json(
        { error: "Download URL not available" },
        { status: 404 }
      );
    }

    // Redirect to Vercel Blob URL
    return NextResponse.redirect(export_.downloadUrl);
  } catch (error) {
    console.error("Export download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

