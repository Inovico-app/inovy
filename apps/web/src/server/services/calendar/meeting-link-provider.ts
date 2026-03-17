import type { ActionResult } from "@/lib/server-action-client/action-errors";
import type { CalendarEvent, MeetingLink, MeetingOptions } from "./types";

export interface MeetingLinkProvider {
  createOnlineMeeting(
    userId: string,
    options: MeetingOptions,
  ): Promise<ActionResult<MeetingLink>>;
  extractMeetingUrl(event: CalendarEvent): string | null;
}
