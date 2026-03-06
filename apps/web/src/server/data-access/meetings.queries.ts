import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  meetings,
  type Meeting,
  type NewMeeting,
} from "../db/schema/meetings";

export class MeetingsQueries {
  static async insert(data: NewMeeting): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(data).returning();
    return meeting;
  }

  static async findById(
    id: string,
    organizationId: string
  ): Promise<Meeting | null> {
    const result = await db
      .select()
      .from(meetings)
      .where(
        and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))
      )
      .limit(1);
    return result[0] ?? null;
  }

  static async findByCalendarEventId(
    calendarEventId: string,
    organizationId: string
  ): Promise<Meeting | null> {
    const result = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.calendarEventId, calendarEventId),
          eq(meetings.organizationId, organizationId)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  static async findUpcoming(
    organizationId: string,
    options?: { limit?: number; userId?: string }
  ): Promise<Meeting[]> {
    const now = new Date();
    const conditions = [
      eq(meetings.organizationId, organizationId),
      gte(meetings.scheduledStartAt, now),
      inArray(meetings.status, ["draft", "scheduled"]),
    ];
    if (options?.userId) {
      conditions.push(eq(meetings.createdById, options.userId));
    }
    return db
      .select()
      .from(meetings)
      .where(and(...conditions))
      .orderBy(meetings.scheduledStartAt)
      .limit(options?.limit ?? 50);
  }

  static async findActiveMeetingsWithAgenda(): Promise<Meeting[]> {
    return db
      .select()
      .from(meetings)
      .where(eq(meetings.status, "in_progress"));
  }

  static async update(
    id: string,
    organizationId: string,
    data: Partial<Omit<Meeting, "id" | "organizationId" | "createdAt">>
  ): Promise<Meeting | null> {
    const [meeting] = await db
      .update(meetings)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))
      )
      .returning();
    return meeting ?? null;
  }
}
