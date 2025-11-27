import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  type NewUserDeletionRequest,
  type UserDeletionRequest,
  userDeletionRequests,
} from "../db/schema/user-deletion-requests";

export class UserDeletionRequestsQueries {
  /**
   * Create a new deletion request
   */
  static async insert(
    data: NewUserDeletionRequest
  ): Promise<UserDeletionRequest> {
    const [request] = await db
      .insert(userDeletionRequests)
      .values(data)
      .returning();
    return request;
  }

  /**
   * Get deletion request by user ID
   */
  static async findByUserId(
    userId: string
  ): Promise<UserDeletionRequest | null> {
    const [request] = await db
      .select()
      .from(userDeletionRequests)
      .where(
        and(
          eq(userDeletionRequests.userId, userId),
          or(
            eq(userDeletionRequests.status, "pending"),
            eq(userDeletionRequests.status, "processing"),
            eq(userDeletionRequests.status, "completed")
          )
        )
      )
      .limit(1);
    return request ?? null;
  }

  /**
   * Get deletion request by ID
   */
  static async findById(id: string): Promise<UserDeletionRequest | null> {
    const [request] = await db
      .select()
      .from(userDeletionRequests)
      .where(eq(userDeletionRequests.id, id))
      .limit(1);
    return request ?? null;
  }

  /**
   * Update deletion request status
   */
  static async updateStatus(
    id: string,
    status: "pending" | "processing" | "completed" | "cancelled",
    additionalData?: {
      processedAt?: Date;
      scheduledDeletionAt?: Date;
      cancelledAt?: Date;
      cancelledBy?: string;
    }
  ): Promise<UserDeletionRequest | null> {
    const [request] = await db
      .update(userDeletionRequests)
      .set({
        status,
        ...additionalData,
        updatedAt: new Date(),
      })
      .where(eq(userDeletionRequests.id, id))
      .returning();
    return request ?? null;
  }

  /**
   * Get all deletion requests scheduled for permanent deletion
   * (scheduledDeletionAt <= now and status is 'completed')
   */
  static async findScheduledForPermanentDeletion(): Promise<
    UserDeletionRequest[]
  > {
    return await db
      .select()
      .from(userDeletionRequests)
      .where(
        and(
          eq(userDeletionRequests.status, "completed"),
          isNull(userDeletionRequests.cancelledAt),
          sql`${userDeletionRequests.scheduledDeletionAt} IS NOT NULL`,
          lte(userDeletionRequests.scheduledDeletionAt, new Date())
        )
      );
  }

  /**
   * Cancel a deletion request
   */
  static async cancel(
    id: string,
    cancelledBy: string
  ): Promise<UserDeletionRequest | null> {
    const [request] = await db
      .update(userDeletionRequests)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy,
        updatedAt: new Date(),
      })
      .where(eq(userDeletionRequests.id, id))
      .returning();
    return request ?? null;
  }
}

