import { getAuthSession } from "@/lib/auth";
import { Permissions } from "@/lib/permissions";
import { checkPermission } from "@/lib/permissions-server";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/role
 * Returns the user's permission information for client-side checks
 * Uses type-safe Better Auth permission helpers
 */
export async function GET() {
  try {
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json(
        { isAdmin: false, isAuthenticated: false },
        { status: 200 }
      );
    }

    const { user } = sessionResult.value;

    if (!user) {
      return NextResponse.json(
        { isAdmin: false, isAuthenticated: false },
        { status: 200 }
      );
    }

    // Check permissions using type-safe helper
    const isAdmin = await checkPermission(Permissions.admin.all);

    return NextResponse.json({
      isAdmin,
      isSuperAdmin: isAdmin, // Superadmin also has admin:all permission
      isAuthenticated: true,
      roles: user.roles,
    });
  } catch (error) {
    console.error("Error checking user permissions", error);
    return NextResponse.json(
      { isAdmin: false, isAuthenticated: false },
      { status: 200 }
    );
  }
}

