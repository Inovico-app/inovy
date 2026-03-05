"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { AuthAnomalyDetectionService } from "@/server/services/auth-anomaly-detection.service";
import { err, ok } from "neverthrow";
import { z } from "zod";

const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

const revokeAllOtherSessionsSchema = z.object({
  currentSessionId: z.string().min(1, "Current session ID is required"),
});

const getLoginHistorySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
});

export const getActiveSessionsAction = authorizedActionClient
  .metadata({
    permissions: {},
  })
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    if (!ctx.user) {
      return resultToActionResponse(
        err(ActionErrors.unauthenticated("User not authenticated", "getActiveSessions"))
      );
    }

    const sessions = await AuthAnomalyDetectionService.getActiveSessions(
      ctx.user.id
    );

    return resultToActionResponse(
      ok({
        sessions: sessions.map((session) => ({
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          isCurrent: false,
        })),
      })
    );
  });

export const revokeSessionAction = authorizedActionClient
  .metadata({
    permissions: {},
  })
  .inputSchema(revokeSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.user) {
      return resultToActionResponse(
        err(ActionErrors.unauthenticated("User not authenticated", "revokeSession"))
      );
    }

    const success = await AuthAnomalyDetectionService.revokeSession(
      parsedInput.sessionId,
      ctx.user.id
    );

    if (!success) {
      return resultToActionResponse(
        err(ActionErrors.notFound("Session", "revokeSession"))
      );
    }

    return resultToActionResponse(ok({ success: true }));
  });

export const revokeAllOtherSessionsAction = authorizedActionClient
  .metadata({
    permissions: {},
  })
  .inputSchema(revokeAllOtherSessionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.user) {
      return resultToActionResponse(
        err(ActionErrors.unauthenticated("User not authenticated", "revokeAllOtherSessions"))
      );
    }

    const count = await AuthAnomalyDetectionService.revokeAllOtherSessions(
      parsedInput.currentSessionId,
      ctx.user.id
    );

    return resultToActionResponse(ok({ count }));
  });

export const getLoginHistoryAction = authorizedActionClient
  .metadata({
    permissions: {},
  })
  .inputSchema(getLoginHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.user) {
      return resultToActionResponse(
        err(ActionErrors.unauthenticated("User not authenticated", "getLoginHistory"))
      );
    }

    const history = await AuthAnomalyDetectionService.getLoginHistory(
      ctx.user.id,
      parsedInput.limit
    );

    return resultToActionResponse(ok({ history }));
  });
