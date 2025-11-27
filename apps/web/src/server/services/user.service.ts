import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
import { UserQueries } from "../data-access/user.queries";

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
   * Get user by ID
   * @param userId - Better Auth user ID
   */
  static async getUserById(userId: string): Promise<ActionResult<UserDto>> {
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
      const userDto: UserDto = {
        id: userData.id,
        email: userData.email ?? null,
        given_name: nameParts[0] ?? null,
        family_name: nameParts.slice(1).join(" ") || null,
        picture: userData.image ?? null,
        emailVerified: userData.emailVerified,
        created_on: userData.createdAt?.toISOString(),
        last_signed_in: undefined, // Better Auth doesn't track last sign-in separately
      };

      logger.info("Successfully fetched user", {
        component: "UserService.getUserById",
        userId,
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
   * Get multiple users by IDs
   * @param userIds - Array of Better Auth user IDs
   */
  static async getUsersByIds(
    userIds: string[]
  ): Promise<ActionResult<UserDto[]>> {
    logger.info("Fetching users by IDs", {
      component: "UserService.getUsersByIds",
      count: userIds.length,
    });

    try {
      const usersData = await UserQueries.findByIds(userIds);

      const usersDto: UserDto[] = usersData.map((userData) => {
        const nameParts = userData.name?.split(" ") ?? [];
        return {
          id: userData.id,
          email: userData.email ?? null,
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
}

