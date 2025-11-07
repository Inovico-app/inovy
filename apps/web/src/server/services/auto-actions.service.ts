import { ActionErrors, type ActionResult } from "@/lib";
import { err, ok } from "neverthrow";
import { AutoActionsQueries } from "../data-access";
import type { AutoAction, NewAutoAction } from "../db/schema";

export class AutoActionsService {
  static async getRecentAutoActions(
    userId: string,
    provider: "google" | "microsoft",
    options?: {
      limit?: number;
      type?: "calendar_event" | "email_draft";
    }
  ): Promise<
    ActionResult<
      Array<AutoAction & { recordingTitle?: string; taskTitle?: string }>
    >
  > {
    try {
      const actions = await AutoActionsQueries.getRecentAutoActions(
        userId,
        provider,
        options
      );
      return ok<
        Array<AutoAction & { recordingTitle?: string; taskTitle?: string }>
      >(actions);
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to get recent auto actions",
          error as Error,
          "AutoActionsService.getRecentAutoActions"
        )
      );
    }
  }

  static async getAutoActionStats(
    userId: string,
    provider: "google" | "microsoft"
  ): Promise<
    ActionResult<{
      total: number;
      completed: number;
      failed: number;
      pending: number;
      calendarEvents: number;
      emailDrafts: number;
    }>
  > {
    try {
      const stats = await AutoActionsQueries.getAutoActionStats(
        userId,
        provider
      );
      return ok<{
        total: number;
        completed: number;
        failed: number;
        pending: number;
        calendarEvents: number;
        emailDrafts: number;
      }>({
        total: stats.total,
        completed: stats.completed,
        failed: stats.failed,
        pending: stats.pending,
        calendarEvents: stats.calendarEvents,
        emailDrafts: stats.emailDrafts,
      });
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to get auto action stats",
          error as Error,
          "AutoActionsService.getAutoActionStats"
        )
      );
    }
  }

  static async retryAutoAction(
    actionId: string,
    userId: string
  ): Promise<ActionResult<AutoAction>> {
    try {
      const action = await AutoActionsQueries.retryAutoAction(actionId, userId);
      if (!action) {
        return err(
          ActionErrors.notFound(
            "Auto action",
            "AutoActionsService.retryAutoAction"
          )
        );
      }
      return ok(action);
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to retry auto action",
          error as Error,
          "AutoActionsService.retryAutoAction"
        )
      );
    }
  }

  static async createAutoAction(
    data: NewAutoAction
  ): Promise<ActionResult<AutoAction>> {
    try {
      const action = await AutoActionsQueries.createAutoAction(data);
      return ok(action);
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to create auto action",
          error as Error,
          "AutoActionsService.createAutoAction"
        )
      );
    }
  }

  static async updateAutoActionStatus(
    actionId: string,
    status: "completed" | "failed" | "processing",
    errorMessage?: string | null
  ): Promise<ActionResult<AutoAction>> {
    try {
      const action = await AutoActionsQueries.updateAutoActionStatus(
        actionId,
        status,
        errorMessage
      );
      if (!action) {
        return err(
          ActionErrors.notFound(
            "Auto action",
            "AutoActionsService.updateAutoActionStatus"
          )
        );
      }
      return ok(action);
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to update auto action status",
          error as Error,
          "AutoActionsService.updateAutoActionStatus"
        )
      );
    }
  }
}

