import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  redactions,
  type NewRedaction,
  type Redaction,
} from "../db/schema/redactions";

/**
 * Redactions Data Access Queries
 * Pure data access layer for redaction operations
 */
export class RedactionsQueries {
  /**
   * Create a new redaction
   */
  static async createRedaction(data: NewRedaction): Promise<Redaction> {
    const [redaction] = await db
      .insert(redactions)
      .values(data)
      .returning();
    return redaction;
  }

  /**
   * Create multiple redactions in a single transaction
   */
  static async createRedactions(
    data: NewRedaction[]
  ): Promise<Redaction[]> {
    if (data.length === 0) {
      return [];
    }
    return await db.insert(redactions).values(data).returning();
  }

  /**
   * Get all redactions for a recording
   */
  static async getRedactionsByRecordingId(
    recordingId: string
  ): Promise<Redaction[]> {
    return await db
      .select()
      .from(redactions)
      .where(eq(redactions.recordingId, recordingId))
      .orderBy(desc(redactions.createdAt));
  }

  /**
   * Get a single redaction by ID
   */
  static async getRedactionById(id: string): Promise<Redaction | null> {
    const [redaction] = await db
      .select()
      .from(redactions)
      .where(eq(redactions.id, id))
      .limit(1);
    return redaction ?? null;
  }

  /**
   * Delete a redaction
   */
  static async deleteRedaction(id: string): Promise<boolean> {
    const result = await db
      .delete(redactions)
      .where(eq(redactions.id, id))
      .returning();
    return result.length > 0;
  }

  /**
   * Delete all redactions for a recording
   */
  static async deleteRedactionsByRecordingId(
    recordingId: string
  ): Promise<number> {
    const result = await db
      .delete(redactions)
      .where(eq(redactions.recordingId, recordingId))
      .returning();
    return result.length;
  }

  /**
   * Update a redaction
   */
  static async updateRedaction(
    id: string,
    updates: Partial<Omit<NewRedaction, "id" | "recordingId" | "createdAt">>
  ): Promise<Redaction | null> {
    const [updated] = await db
      .update(redactions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(redactions.id, id))
      .returning();
    return updated ?? null;
  }
}

