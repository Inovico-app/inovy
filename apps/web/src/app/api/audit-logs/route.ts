import { getAuthSession } from "@/lib/auth";
import { AuditLogService } from "@/server/services/audit-log.service";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.organization
    ) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const userRoles =
      authResult.value.user?.roles?.map((role) => role.toLowerCase()) ?? [];
    if (!userRoles.includes("admin") && !userRoles.includes("super_admin")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { organization } = authResult.value;
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      userId: searchParams.get("userId") ?? undefined,
      eventType: searchParams.get("eventType")
        ? searchParams.get("eventType")!.split(",")
        : undefined,
      resourceType: searchParams.get("resourceType")
        ? searchParams.get("resourceType")!.split(",")
        : undefined,
      action: searchParams.get("action")
        ? searchParams.get("action")!.split(",")
        : undefined,
      resourceId: searchParams.get("resourceId") ?? undefined,
      startDate: searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined,
      endDate: searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : 100,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : 0,
    };

    const result = await AuditLogService.getAuditLogs(
      organization.orgCode,
      filters
    );

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

