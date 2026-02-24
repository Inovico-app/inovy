"use server";

import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { createServerAction } from "@/lib/server-action-client/create-server-action";
import { AuthAnomalyDetectionService } from "@/server/services/auth-anomaly-detection.service";
import { z } from "zod";

const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

const revokeAllOtherSessionsSchema = z.object({
  currentSessionId: z.string().min(1, "Current session ID is required"),
});

export const getActiveSessionsAction = createServerAction({
  requireAuth: true,
})
  .input(z.void())
  .handler(async ({ ctx }) => {
    const sessions = await AuthAnomalyDetectionService.getActiveSessions(
      ctx.user.id
    );

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isCurrent: session.id === ctx.session.id,
      })),
    };
  });

export const revokeSessionAction = createServerAction({
  requireAuth: true,
})
  .input(revokeSessionSchema)
  .handler(async ({ input, ctx }) => {
    if (input.sessionId === ctx.session.id) {
      throw ActionErrors.validation(
        "Cannot revoke current session",
        undefined,
        "revokeSession"
      );
    }

    const success = await AuthAnomalyDetectionService.revokeSession(
      input.sessionId,
      ctx.user.id
    );

    if (!success) {
      throw ActionErrors.notFound("Session", "revokeSession");
    }

    return { success: true };
  });

export const revokeAllOtherSessionsAction = createServerAction({
  requireAuth: true,
})
  .input(revokeAllOtherSessionsSchema)
  .handler(async ({ input, ctx }) => {
    const count = await AuthAnomalyDetectionService.revokeAllOtherSessions(
      input.currentSessionId,
      ctx.user.id
    );

    return { count };
  });

export const getLoginHistoryAction = createServerAction({
  requireAuth: true,
})
  .input(
    z.object({
      limit: z.number().min(1).max(100).optional().default(20),
    })
  )
  .handler(async ({ input, ctx }) => {
    const history = await AuthAnomalyDetectionService.getLoginHistory(
      ctx.user.id,
      input.limit
    );

    return { history };
  });
