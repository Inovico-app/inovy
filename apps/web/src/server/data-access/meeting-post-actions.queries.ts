import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  meetingPostActions,
  type MeetingPostAction,
  type NewMeetingPostAction,
} from "../db/schema/meeting-post-actions";

export class MeetingPostActionsQueries {
  static async insert(
    data: NewMeetingPostAction
  ): Promise<MeetingPostAction> {
    const [action] = await db
      .insert(meetingPostActions)
      .values(data)
      .returning();
    return action;
  }

  static async insertMany(
    data: NewMeetingPostAction[]
  ): Promise<MeetingPostAction[]> {
    if (data.length === 0) return [];
    return db.insert(meetingPostActions).values(data).returning();
  }

  static async findByMeetingId(
    meetingId: string
  ): Promise<MeetingPostAction[]> {
    return db
      .select()
      .from(meetingPostActions)
      .where(eq(meetingPostActions.meetingId, meetingId));
  }

  static async findPendingByMeetingId(
    meetingId: string
  ): Promise<MeetingPostAction[]> {
    return db
      .select()
      .from(meetingPostActions)
      .where(
        and(
          eq(meetingPostActions.meetingId, meetingId),
          eq(meetingPostActions.status, "pending")
        )
      );
  }

  static async update(
    id: string,
    data: Partial<
      Omit<MeetingPostAction, "id" | "meetingId" | "createdAt">
    >
  ): Promise<MeetingPostAction | null> {
    const [action] = await db
      .update(meetingPostActions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(meetingPostActions.id, id))
      .returning();
    return action ?? null;
  }
}
