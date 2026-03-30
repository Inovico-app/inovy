import { getBetterAuthSession } from "@/lib/better-auth-session";
import { hasExactRole } from "@/lib/permissions/predicates";
import type { Role } from "@/lib/permissions/types";
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

  if (
    !hasExactRole("superadmin").check({
      role: authResult.value.member.role as Role,
      userId: authResult.value.user?.id ?? "",
    })
  ) {
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

  if (
    !hasExactRole("superadmin").check({
      role: member.role as Role,
      userId: user?.id ?? "",
    })
  ) {
    logger.security.unauthorizedAccess({
      userId: user?.id ?? "unknown",
      resource: "agent-kill-switch",
      action: "toggle",
      reason: `Role "${member.role}" attempted to toggle kill switch`,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const parsed = killSwitchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error },
      { status: 400 },
    );
  }

  const success = await AgentKillSwitchService.setKillSwitch(
    parsed.data.active,
  );

  if (!success) {
    return NextResponse.json(
      { error: "Failed to update kill switch — Redis unavailable" },
      { status: 503 },
    );
  }

  // Compute effective state without extra Redis round-trip:
  // env var always overrides to true, otherwise the just-written value is effective
  const effectiveState =
    process.env.AGENT_GLOBAL_KILL_SWITCH === "true" || parsed.data.active;

  logger.info("Agent kill switch toggled", {
    component: "api/admin/agent/kill-switch",
    requested: parsed.data.active,
    effective: effectiveState,
    userId: user?.id,
  });

  return NextResponse.json({
    requested: parsed.data.active,
    effective: effectiveState,
  });
}
