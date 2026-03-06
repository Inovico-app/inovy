import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import {
  meetingAgendaTemplates,
  type MeetingAgendaTemplate,
  type NewMeetingAgendaTemplate,
} from "../db/schema/meeting-agenda-templates";

export class MeetingAgendaTemplatesQueries {
  static async insert(
    data: NewMeetingAgendaTemplate
  ): Promise<MeetingAgendaTemplate> {
    const [template] = await db
      .insert(meetingAgendaTemplates)
      .values(data)
      .returning();
    return template;
  }

  static async findAvailable(
    organizationId: string
  ): Promise<MeetingAgendaTemplate[]> {
    return db
      .select()
      .from(meetingAgendaTemplates)
      .where(
        or(
          eq(meetingAgendaTemplates.isSystem, true),
          eq(meetingAgendaTemplates.organizationId, organizationId)
        )
      );
  }

  static async findById(
    id: string,
    organizationId: string
  ): Promise<MeetingAgendaTemplate | null> {
    const result = await db
      .select()
      .from(meetingAgendaTemplates)
      .where(
        and(
          eq(meetingAgendaTemplates.id, id),
          or(
            eq(meetingAgendaTemplates.organizationId, organizationId),
            eq(meetingAgendaTemplates.isSystem, true)
          )
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  static async delete(
    id: string,
    organizationId: string
  ): Promise<boolean> {
    const result = await db
      .delete(meetingAgendaTemplates)
      .where(
        and(
          eq(meetingAgendaTemplates.id, id),
          eq(meetingAgendaTemplates.organizationId, organizationId)
        )
      )
      .returning();
    return result.length > 0;
  }
}
