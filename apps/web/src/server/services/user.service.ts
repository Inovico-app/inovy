import { err, ok } from "neverthrow";
import type { BetterAuthUser } from "../../lib/auth";
import {
  canAccessUserEmails,
  redactEmail,
} from "../../lib/data-minimization";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { UserQueries } from "../data-access/user.queries";

/**
 * User DTO with data minimization
 * 
 * Data Minimization (SSD-4.4.01):
 * - email: Only included in full for organization admins or own user
 * - For non-admins viewing other users, email is redacted (e.g., j***@example.com)
 */
export interface UserDto {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
  emailVerified: boolean;
  created_on?: string;
  last_signed_in?: string;
}

/**
 * User Service
 * Handles business logic for user-related operations
 * Uses Better Auth user tables for data access
 */
export class UserService {
  /**
   * Get user by ID with data minimization
   * @param userId - Better Auth user ID
   * @param requestingUser - Optional user making the request (for role-based filtering)
   */
  static async getUserById(
    userId: string,
    requestingUser?: BetterAuthUser
  ): Promise<ActionResult<UserDto>> {
    logger.info("Fetching user by ID", {
      component: "UserService.getUserById",
      userId,
    });

    try {
      const userData = await UserQueries.findById(userId);

      if (!userData) {
        logger.warn("User not found", {
          component: "UserService.getUserById",
          userId,
        });
        return err(ActionErrors.notFound("User", "UserService.getUserById"));
      }

      const nameParts = userData.name?.split(" ") ?? [];
      
      // Apply data minimization: redact email for non-admin users
      const canSeeEmail = requestingUser
        ? canAccessUserEmails(requestingUser, userId)
        : false;
      
      const email = canSeeEmail
        ? (userData.email ?? null)
        : redactEmail(userData.email);

      const userDto: UserDto = {
        id: userData.id,
        email,
        given_name: nameParts[0] ?? null,
        family_name: nameParts.slice(1).join(" ") || null,
        picture: userData.image ?? null,
        emailVerified: userData.emailVerified,
        created_on: userData.createdAt?.toISOString(),
        last_signed_in: undefined,
      };

      logger.info("Successfully fetched user", {
        component: "UserService.getUserById",
        userId,
        emailRedacted: !canSeeEmail,
      });

      return ok(userDto);
    } catch (error) {
      logger.error("Failed to get user by ID", {
        component: "UserService.getUserById",
        error,
        userId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get user",
          error as Error,
          "UserService.getUserById"
        )
      );
    }
  }

  /**
   * Get multiple users by IDs with data minimization
   * @param userIds - Array of Better Auth user IDs
   * @param requestingUser - Optional user making the request (for role-based filtering)
   */
  static async getUsersByIds(
    userIds: string[],
    requestingUser?: BetterAuthUser
  ): Promise<ActionResult<UserDto[]>> {
    logger.info("Fetching users by IDs", {
      component: "UserService.getUsersByIds",
      count: userIds.length,
    });

    try {
      const usersData = await UserQueries.findByIds(userIds);

      const usersDto: UserDto[] = usersData.map((userData) => {
        const nameParts = userData.name?.split(" ") ?? [];
        
        // Apply data minimization: redact email for non-admin users
        const canSeeEmail = requestingUser
          ? canAccessUserEmails(requestingUser, userData.id)
          : false;
        
        const email = canSeeEmail
          ? (userData.email ?? null)
          : redactEmail(userData.email);

        return {
          id: userData.id,
          email,
          given_name: nameParts[0] ?? null,
          family_name: nameParts.slice(1).join(" ") || null,
          picture: userData.image ?? null,
          emailVerified: userData.emailVerified,
          created_on: userData.createdAt?.toISOString(),
          last_signed_in: undefined,
        };
      });

      logger.info("Successfully fetched users", {
        component: "UserService.getUsersByIds",
        count: usersDto.length,
      });

      return ok(usersDto);
    } catch (error) {
      logger.error("Failed to get users by IDs", {
        component: "UserService.getUsersByIds",
        error,
      });

      return err(
        ActionErrors.internal(
          "Failed to get users",
          error as Error,
          "UserService.getUsersByIds"
        )
      );
    }
  }

  /**
   * Get user by email
   * @param email - User email address
   */
  static async getUserByEmail(email: string): Promise<ActionResult<UserDto>> {
    logger.info("Fetching user by email", {
      component: "UserService.getUserByEmail",
      email,
    });

    try {
      const userData = await UserQueries.findByEmail(email);

      if (!userData) {
        logger.warn("User not found by email", {
          component: "UserService.getUserByEmail",
          email,
        });
        return err(ActionErrors.notFound("User", "UserService.getUserByEmail"));
      }

      const nameParts = userData.name?.split(" ") ?? [];
      const userDto: UserDto = {
        id: userData.id,
        email: userData.email ?? null,
        given_name: nameParts[0] ?? null,
        family_name: nameParts.slice(1).join(" ") || null,
        picture: userData.image ?? null,
        emailVerified: userData.emailVerified,
        created_on: userData.createdAt?.toISOString(),
        last_signed_in: undefined,
      };

      logger.info("Successfully fetched user by email", {
        component: "UserService.getUserByEmail",
        email,
      });

      return ok(userDto);
    } catch (error) {
      logger.error("Failed to get user by email", {
        component: "UserService.getUserByEmail",
        error,
        email,
      });

      return err(
        ActionErrors.internal(
          "Failed to get user",
          error as Error,
          "UserService.getUserByEmail"
        )
      );
    }
  }

  /**
   * Update user by ID
   * @param userId - Better Auth user ID
   * @param data - User data to update (given_name and family_name will be combined into name)
   */
  static async updateUser(
    userId: string,
    data: {
      given_name?: string | null;
      family_name?: string | null;
      picture?: string | null;
    }
  ): Promise<ActionResult<UserDto>> {
    logger.info("Updating user", {
      component: "UserService.updateUser",
      userId,
    });

    try {
      // Combine given_name and family_name into a single name field
      const nameParts: string[] = [];
      if (data.given_name) {
        nameParts.push(data.given_name);
      }
      if (data.family_name) {
        nameParts.push(data.family_name);
      }
      const name = nameParts.length > 0 ? nameParts.join(" ") : null;

      const updateData: {
        name?: string;
        image?: string | null;
      } = {};

      if (name !== undefined && name !== null) {
        updateData.name = name;
      }
      if (data.picture !== undefined) {
        updateData.image = data.picture;
      }

      const updatedUser = await UserQueries.updateById(userId, updateData);

      if (!updatedUser) {
        logger.warn("User not found for update", {
          component: "UserService.updateUser",
          userId,
        });
        return err(ActionErrors.notFound("User", "UserService.updateUser"));
      }

      const namePartsResult = updatedUser.name?.split(" ") ?? [];
      const userDto: UserDto = {
        id: updatedUser.id,
        email: updatedUser.email ?? null,
        given_name: namePartsResult[0] ?? null,
        family_name: namePartsResult.slice(1).join(" ") ?? null,
        picture: updatedUser.image ?? null,
        emailVerified: updatedUser.emailVerified,
        created_on: updatedUser.createdAt?.toISOString(),
        last_signed_in: undefined,
      };

      logger.info("Successfully updated user", {
        component: "UserService.updateUser",
        userId,
      });

      return ok(userDto);
    } catch (error) {
      logger.error("Failed to update user", {
        component: "UserService.updateUser",
        error,
        userId,
      });

      return err(
        ActionErrors.internal(
          "Failed to update user",
          error as Error,
          "UserService.updateUser"
        )
      );
    }
  }

  /**
   * Update user's onboarding completed status
   * @param userId - Better Auth user ID
   * @param completed - Whether onboarding is completed
   */
  static async updateOnboardingCompleted(
    userId: string,
    completed: boolean
  ): Promise<ActionResult<boolean>> {
    logger.info("Updating user onboarding completed status", {
      component: "UserService.updateOnboardingCompleted",
      userId,
      completed,
    });

    try {
      await UserQueries.updateOnboardingCompleted(userId, completed);

      logger.info("Successfully updated user onboarding completed status", {
        component: "UserService.updateOnboardingCompleted",
        userId,
        completed,
      });

      return ok(true);
    } catch (error) {
      logger.error("Failed to update user onboarding completed status", {
        component: "UserService.updateOnboardingCompleted",
        error,
        userId,
        completed,
      });

      return err(
        ActionErrors.internal(
          "Failed to update user onboarding completed status",
          error as Error,
          "UserService.updateOnboardingCompleted"
        )
      );
    }
  }

  /**
   * Get organizationId for a user
   * @param userId - Better Auth user ID
   * @returns Organization ID or error if user is not a member of any organization
   */
  static async getOrganizationIdByUserId(
    userId: string
  ): Promise<ActionResult<string>> {
    logger.info("Fetching organization ID for user", {
      component: "UserService.getOrganizationIdByUserId",
      userId,
    });

    try {
      const organizationId =
        await UserQueries.getOrganizationIdByUserId(userId);

      if (!organizationId) {
        logger.warn("User is not a member of any organization", {
          component: "UserService.getOrganizationIdByUserId",
          userId,
        });
        return err(
          ActionErrors.notFound(
            "User organization membership",
            "UserService.getOrganizationIdByUserId"
          )
        );
      }

      logger.info("Successfully fetched organization ID for user", {
        component: "UserService.getOrganizationIdByUserId",
        userId,
        organizationId,
      });

      return ok(organizationId);
    } catch (error) {
      logger.error("Failed to get organization ID for user", {
        component: "UserService.getOrganizationIdByUserId",
        error,
        userId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get organization ID for user",
          error as Error,
          "UserService.getOrganizationIdByUserId"
        )
      );
    }
  }
}

