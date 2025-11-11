import { getAuthSession } from "@/lib";
import { ROLES } from "@/lib/rbac";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/role
 * Returns the user's role information for client-side checks
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

    return NextResponse.json({
      isAdmin: user.roles?.includes(ROLES.ADMIN),
      isSuperAdmin: user.roles?.includes(ROLES.SUPER_ADMIN),
      isAuthenticated: true,
      roles: user.roles,
    });
  } catch (error) {
    console.error("Error checking user role", error);
    return NextResponse.json(
      { isAdmin: false, isAuthenticated: false },
      { status: 200 }
    );
  }
}

