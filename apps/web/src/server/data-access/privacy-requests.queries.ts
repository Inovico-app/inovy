import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  type NewPrivacyRequest,
  type PrivacyRequest,
  type PrivacyRequestType,
  type ProcessingScope,
  privacyRequests,
} from "../db/schema/privacy-requests";

export class PrivacyRequestsQueries {
  /**
   * Create a new privacy request
   */
  static async insert(data: NewPrivacyRequest): Promise<PrivacyRequest> {
    const [request] = await db.insert(privacyRequests).values(data).returning();
    return request;
  }

  /**
   * Find active request by user, type, and scope
   */
  static async findActive(
    userId: string,
    type: PrivacyRequestType,
    scope: ProcessingScope,
  ): Promise<PrivacyRequest | null> {
    const [request] = await db
      .select()
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.userId, userId),
          eq(privacyRequests.type, type),
          eq(privacyRequests.scope, scope),
          eq(privacyRequests.status, "active"),
        ),
      )
      .limit(1);
    return request ?? null;
  }

  /**
   * Find all active requests for a user
   */
  static async findAllActiveByUserId(
    userId: string,
  ): Promise<PrivacyRequest[]> {
    return db
      .select()
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.userId, userId),
          eq(privacyRequests.status, "active"),
        ),
      )
      .orderBy(desc(privacyRequests.requestedAt));
  }

  /**
   * Find all requests for a user (including resolved/withdrawn)
   */
  static async findAllByUserId(userId: string): Promise<PrivacyRequest[]> {
    return db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.userId, userId))
      .orderBy(desc(privacyRequests.requestedAt));
  }

  /**
   * Find request by ID
   */
  static async findById(id: string): Promise<PrivacyRequest | null> {
    const [request] = await db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.id, id))
      .limit(1);
    return request ?? null;
  }

  /**
   * Withdraw a privacy request (user-initiated)
   */
  static async withdraw(id: string): Promise<PrivacyRequest | null> {
    const [request] = await db
      .update(privacyRequests)
      .set({
        status: "withdrawn",
        withdrawnAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(privacyRequests.id, id), eq(privacyRequests.status, "active")),
      )
      .returning();
    return request ?? null;
  }

  /**
   * Check if processing is restricted for a user and scope
   */
  static async isProcessingRestricted(
    userId: string,
    scope: ProcessingScope,
  ): Promise<boolean> {
    const [request] = await db
      .select({ id: privacyRequests.id })
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.userId, userId),
          eq(privacyRequests.status, "active"),
          eq(privacyRequests.scope, scope),
        ),
      )
      .limit(1);
    return !!request;
  }
}
