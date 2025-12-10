import { auth } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "../db";
import { members, users } from "../db/schema/auth";

// Infer Better Auth types
type BetterAuthUser = typeof auth.$Infer.Session.user;

/**
 * Database queries for User operations
 * Uses Better Auth APIs for updates where available
 * Note: Better Auth doesn't provide read APIs for arbitrary users (only admin APIs),
 * so read operations still use direct DB access
 * Pure data access layer - no business logic
 */
export class UserQueries {
  /**
   * Get a user by ID
   * Note: Better Auth doesn't provide a direct API for this,
   * so we use direct DB access
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
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return userData ?? null;
  }

  /**
   * Get multiple users by IDs
   * Note: Better Auth doesn't provide a direct API for this,
   * so we use direct DB access
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
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(inArray(users.id, userIds));
  }

  /**
   * Get user by email
   * Note: Better Auth doesn't provide a direct API for this,
   * so we use direct DB access
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
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return userData ?? null;
  }

  /**
   * Get the current user from session using Better Auth API
   */
  static async getCurrentUser(
    requestHeaders?: Headers
  ): Promise<BetterAuthUser | null> {
    const headersList = requestHeaders ?? (await headers());

    try {
      const session = await auth.api.getSession({
        headers: headersList,
      });

      return session?.user ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Update a user using Better Auth API
   * Note: Better Auth updateUser API only updates the current user
   */
  static async updateUser(
    data: {
      name?: string;
      image?: string | null;
    },
    requestHeaders?: Headers
  ): Promise<boolean> {
    const headersList = requestHeaders ?? (await headers());

    try {
      const result = await auth.api.updateUser({
        headers: headersList,
        body: {
          name: data.name,
          image: data.image ?? undefined,
        },
      });

      // Better Auth updateUser returns the updated user
      return result.status;
    } catch {
      return false;
    }
  }

  /**
   * Change password using Better Auth API
   */
  static async changePassword(
    data: {
      newPassword: string;
      currentPassword: string;
      revokeOtherSessions?: boolean;
    },
    requestHeaders?: Headers
  ): Promise<{ success: boolean }> {
    const headersList = requestHeaders ?? (await headers());

    try {
      await auth.api.changePassword({
        headers: headersList,
        body: {
          newPassword: data.newPassword,
          currentPassword: data.currentPassword,
          revokeOtherSessions: data.revokeOtherSessions,
        },
      });

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Set password for a user (server-side only, typically for OAuth users)
   */
  static async setPassword(
    newPassword: string,
    requestHeaders?: Headers
  ): Promise<{ success: boolean }> {
    const headersList = requestHeaders ?? (await headers());

    try {
      await auth.api.setPassword({
        headers: headersList,
        body: {
          newPassword,
        },
      });

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * List user accounts using Better Auth API
   */
  static async listAccounts(
    requestHeaders?: Headers
  ): Promise<
    Array<{ id: string; providerId: string; accountId: string; userId: string }>
  > {
    const headersList = requestHeaders ?? (await headers());

    try {
      const accounts = await auth.api.listUserAccounts({
        headers: headersList,
      });

      return Array.isArray(accounts)
        ? accounts.map((account) => ({
            id: account.id,
            providerId: account.providerId,
            accountId: account.accountId,
            userId: account.userId,
          }))
        : [];
    } catch {
      return [];
    }
  }

  /**
   * Update a user by ID
   * Note: Better Auth updateUser API only updates the current user,
   * so for updating other users, we fall back to direct DB access
   * @deprecated Use updateUser() for current user or admin APIs for other users
   */
  static async updateById(
    userId: string,
    data: {
      name?: string;
      image?: string | null;
    },
    requestHeaders?: Headers
  ): Promise<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const headersList = requestHeaders ?? (await headers());

    try {
      // Get current session to check if updating current user
      const session = await auth.api.getSession({
        headers: headersList,
      });

      // If updating the current user, use Better Auth API
      if (session?.user?.id === userId) {
        const success = await this.updateUser(data, headersList);
        if (!success) return null;

        // Get updated user from session
        const updatedSession = await auth.api.getSession({
          headers: headersList,
        });

        if (!updatedSession?.user) return null;

        return {
          id: updatedSession.user.id,
          email: updatedSession.user.email,
          name: updatedSession.user.name ?? null,
          image: updatedSession.user.image ?? null,
          emailVerified: updatedSession.user.emailVerified ?? false,
          createdAt: updatedSession.user.createdAt ?? new Date(),
          updatedAt: updatedSession.user.updatedAt ?? new Date(),
        };
      }
    } catch {
      // Fall through to DB update if Better Auth API fails
    }

    // Fall back to direct DB update for other users or if Better Auth fails
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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

  /**
   * Get organizationId for a user by querying members table
   * Pure data access - no business logic
   */
  static async getOrganizationIdByUserId(
    userId: string
  ): Promise<string | null> {
    const [member] = await db
      .select({ organizationId: members.organizationId })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    return member?.organizationId ?? null;
  }
}

