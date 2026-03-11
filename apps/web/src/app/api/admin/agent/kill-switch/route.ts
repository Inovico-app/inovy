import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { AgentKillSwitchService } from "@/server/services/agent-kill-switch.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const killSwitchSchema = z.object({
  active: z.boolean(),
});

/**
 * GET /api/admin/agent/kill-switch
 * Returns whether the global agent kill switch is active.
 * Requires superadmin role.
 */
export async function GET() {
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.member
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (authResult.value.member.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isKilled = await AgentKillSwitchService.isKilled();
  return NextResponse.json({ active: isKilled });
}

/**
 * POST /api/admin/agent/kill-switch
 * Toggle the global agent kill switch. Body: { active: boolean }
 * Requires superadmin role.
 */
export async function POST(request: Request) {
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.member
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { member, user } = authResult.value;

  if (member.role !== "superadmin") {
    logger.security.unauthorizedAccess({
      userId: user?.id ?? "unknown",
      resource: "agent-kill-switch",
      action: "toggle",
      reason: `Role "${member.role}" attempted to toggle kill switch`,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = killSwitchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error },
      { status: 400 }
    );
  }

  const success = await AgentKillSwitchService.setKillSwitch(parsed.data.active);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to update kill switch — Redis unavailable" },
      { status: 503 }
    );
  }

  logger.info("Agent kill switch toggled", {
    component: "api/admin/agent/kill-switch",
    active: parsed.data.active,
    userId: user?.id,
  });

  return NextResponse.json({ active: parsed.data.active });
}
