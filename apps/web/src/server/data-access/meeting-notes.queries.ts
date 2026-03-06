import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  meetingNotes,
  type MeetingNote,
  type NewMeetingNote,
  type MeetingNoteType,
} from "../db/schema/meeting-notes";

export class MeetingNotesQueries {
  static async upsert(data: NewMeetingNote): Promise<MeetingNote> {
    const existing = await db
      .select()
      .from(meetingNotes)
      .where(
        and(
          eq(meetingNotes.meetingId, data.meetingId),
          eq(meetingNotes.createdById, data.createdById),
          eq(meetingNotes.type, data.type)
        )
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(meetingNotes)
        .set({ content: data.content, updatedAt: new Date() })
        .where(eq(meetingNotes.id, existing[0].id))
        .returning();
      return updated;
    }

    const [note] = await db.insert(meetingNotes).values(data).returning();
    return note;
  }

  static async findByMeetingId(meetingId: string): Promise<MeetingNote[]> {
    return db
      .select()
      .from(meetingNotes)
      .where(eq(meetingNotes.meetingId, meetingId))
      .orderBy(desc(meetingNotes.createdAt));
  }

  static async findByMeetingAndType(
    meetingId: string,
    type: MeetingNoteType
  ): Promise<MeetingNote | null> {
    const result = await db
      .select()
      .from(meetingNotes)
      .where(
        and(
          eq(meetingNotes.meetingId, meetingId),
          eq(meetingNotes.type, type)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }
}
