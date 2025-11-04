import { NextResponse } from "next/server";
import { getAuthSessionWithRoles } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/rbac";

/**
 * GET /api/auth/role
 * Returns the user's role information for client-side checks
 */
export async function GET() {
  try {
    const sessionResult = await getAuthSessionWithRoles();

    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json(
        { isAdmin: false, isAuthenticated: false },
        { status: 200 }
      );
    }

    const session = sessionResult.value;

    if (!session.user) {
      return NextResponse.json(
        { isAdmin: false, isAuthenticated: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      isAdmin: isOrganizationAdmin(session.user),
      isAuthenticated: true,
      roles: session.user.roles,
    });
  } catch (error) {
    console.error("Error checking user role", error);
    return NextResponse.json(
      { isAdmin: false, isAuthenticated: false },
      { status: 200 }
    );
  }
}

