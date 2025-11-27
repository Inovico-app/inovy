import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema/auth";

/**
 * Database queries for User operations
 * Pure data access layer - no business logic
 */
export class UserQueries {
  /**
   * Get a user by ID
   */
  static async findById(userId: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const [userData] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return userData ?? null;
  }

  /**
   * Get multiple users by IDs
   */
  static async findByIds(userIds: string[]): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      emailVerified: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    if (userIds.length === 0) {
      return [];
    }

    return await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(inArray(user.id, userIds));
  }

  /**
   * Get user by email
   */
  static async findByEmail(email: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const [userData] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

      return userData ?? null;
  }

  /**
   * Update a user by ID
   */
  static async updateById(
    userId: string,
    data: {
      name?: string;
      image?: string | null;
    }
  ): Promise<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const [updatedUser] = await db
      .update(user)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();

    if (!updatedUser) return null;

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      image: updatedUser.image,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}

