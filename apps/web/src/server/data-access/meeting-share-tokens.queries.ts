import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  meetingShareTokens,
  type MeetingShareToken,
  type NewMeetingShareToken,
} from "../db/schema/meeting-share-tokens";

export class MeetingShareTokensQueries {
  static async insert(
    data: NewMeetingShareToken
  ): Promise<MeetingShareToken> {
    const [token] = await db
      .insert(meetingShareTokens)
      .values(data)
      .returning();
    return token;
  }

  static async findValidByHash(
    tokenHash: string
  ): Promise<MeetingShareToken | null> {
    const now = new Date();
    const result = await db
      .select()
      .from(meetingShareTokens)
      .where(
        and(
          eq(meetingShareTokens.tokenHash, tokenHash),
          gt(meetingShareTokens.expiresAt, now),
          isNull(meetingShareTokens.revokedAt)
        )
      )
      .limit(1);
    return result[0] ?? null;
  }

  static async markAccessed(id: string): Promise<void> {
    await db
      .update(meetingShareTokens)
      .set({ accessedAt: new Date() })
      .where(eq(meetingShareTokens.id, id));
  }

  static async revoke(id: string): Promise<void> {
    await db
      .update(meetingShareTokens)
      .set({ revokedAt: new Date() })
      .where(eq(meetingShareTokens.id, id));
  }
}
