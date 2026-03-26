import { err, ok } from "neverthrow";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { invalidateFor } from "@/lib/cache";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { type NewMeeting, type Meeting } from "@/server/db/schema/meetings";
import { NotificationService } from "./notification.service";

export class MeetingService {
  /**
   * Create a meeting and optionally notify the creator
   */
  static async createMeeting(data: NewMeeting): Promise<ActionResult<Meeting>> {
    try {
      const meeting = await MeetingsQueries.insert(data);

      invalidateFor("meeting", "create", {
        userId: data.createdById,
        organizationId: data.organizationId,
      });

      // Send prep notification (only if projectId exists — notifications require it)
      if (data.projectId) {
        await NotificationService.createNotification({
          userId: data.createdById,
          organizationId: data.organizationId,
          projectId: data.projectId,
          recordingId: null,
          type: "bot_session_update",
          title: "New meeting detected",
          message: `${data.title} - Add an agenda to prepare.`,
          metadata: { meetingId: meeting.id },
        }).catch((notifyError) => {
          logger.warn("Failed to send meeting prep notification", {
            component: "MeetingService",
            meetingId: meeting.id,
            error:
              notifyError instanceof Error
                ? notifyError.message
                : String(notifyError),
          });
        });
      }

      logger.info("Meeting created", {
        component: "MeetingService",
        meetingId: meeting.id,
        organizationId: data.organizationId,
      });

      return ok(meeting);
    } catch (error) {
      logger.error(
        "Failed to create meeting",
        { component: "MeetingService" },
        error as Error,
      );
      return err(ActionErrors.internal("Failed to create meeting", error));
    }
  }

  /**
   * Find or create a meeting for a calendar event (dedup by calendarEventId)
   */
  static async findOrCreateForCalendarEvent(
    calendarEventId: string,
    organizationId: string,
    meetingData: NewMeeting,
  ): Promise<ActionResult<Meeting>> {
    try {
      const existing = await MeetingsQueries.findByCalendarEventId(
        calendarEventId,
        organizationId,
      );

      if (existing) {
        return ok(existing);
      }

      return this.createMeeting(meetingData);
    } catch (error) {
      logger.error(
        "Failed to find or create meeting",
        {
          component: "MeetingService",
          calendarEventId,
        },
        error as Error,
      );
      return err(
        ActionErrors.internal("Failed to find or create meeting", error),
      );
    }
  }

  /**
   * Transition meeting status based on bot events
   */
  static async updateStatus(
    meetingId: string,
    organizationId: string,
    status: Meeting["status"],
    additionalData?: Partial<Meeting>,
  ): Promise<ActionResult<Meeting>> {
    try {
      const meeting = await MeetingsQueries.update(meetingId, organizationId, {
        status,
        ...additionalData,
      });

      if (!meeting) {
        return err(ActionErrors.notFound("Meeting"));
      }

      invalidateFor("meeting", "update", {
        userId: meeting.createdById ?? "",
        organizationId,
        input: { meetingId },
      });

      return ok(meeting);
    } catch (error) {
      logger.error(
        "Failed to update meeting status",
        {
          component: "MeetingService",
          meetingId,
          status,
        },
        error as Error,
      );
      return err(
        ActionErrors.internal("Failed to update meeting status", error),
      );
    }
  }
}
