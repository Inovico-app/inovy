import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  meetingAgendaItems,
  type MeetingAgendaItem,
  type NewMeetingAgendaItem,
} from "../db/schema/meeting-agenda-items";

export class MeetingAgendaItemsQueries {
  static async insert(
    data: NewMeetingAgendaItem
  ): Promise<MeetingAgendaItem> {
    const [item] = await db
      .insert(meetingAgendaItems)
      .values(data)
      .returning();
    return item;
  }

  static async insertMany(
    data: NewMeetingAgendaItem[]
  ): Promise<MeetingAgendaItem[]> {
    if (data.length === 0) return [];
    return db.insert(meetingAgendaItems).values(data).returning();
  }

  static async findByMeetingId(
    meetingId: string
  ): Promise<MeetingAgendaItem[]> {
    return db
      .select()
      .from(meetingAgendaItems)
      .where(eq(meetingAgendaItems.meetingId, meetingId))
      .orderBy(asc(meetingAgendaItems.sortOrder));
  }

  static async findUncheckedByMeetingId(
    meetingId: string
  ): Promise<MeetingAgendaItem[]> {
    return db
      .select()
      .from(meetingAgendaItems)
      .where(
        and(
          eq(meetingAgendaItems.meetingId, meetingId),
          inArray(meetingAgendaItems.status, ["pending", "in_progress"])
        )
      )
      .orderBy(asc(meetingAgendaItems.sortOrder));
  }

  static async update(
    id: string,
    meetingId: string,
    data: Partial<Omit<MeetingAgendaItem, "id" | "meetingId" | "createdAt">>
  ): Promise<MeetingAgendaItem | null> {
    const [item] = await db
      .update(meetingAgendaItems)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(meetingAgendaItems.id, id),
          eq(meetingAgendaItems.meetingId, meetingId)
        )
      )
      .returning();
    return item ?? null;
  }

  static async delete(id: string, meetingId: string): Promise<boolean> {
    const result = await db
      .delete(meetingAgendaItems)
      .where(
        and(
          eq(meetingAgendaItems.id, id),
          eq(meetingAgendaItems.meetingId, meetingId)
        )
      )
      .returning();
    return result.length > 0;
  }

  static async deleteByMeetingId(meetingId: string): Promise<void> {
    await db
      .delete(meetingAgendaItems)
      .where(eq(meetingAgendaItems.meetingId, meetingId));
  }
}
