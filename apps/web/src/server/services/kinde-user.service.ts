import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { getKindeApiClient } from "../../lib/kinde-api";
import { logger } from "../../lib/logger";
import type {
  CreateKindeUserDto,
  KindeOrganizationUserDto,
  KindeUserDto,
  UpdateKindeUserDto,
} from "../dto/kinde.dto";

/**
 * Kinde User Service
 * Handles all user operations via Kinde Management API
 */

export class KindeUserService {
  /**
   * Get a user by their Kinde ID
   */
  static async getUserById(
    kindeUserId: string
  ): Promise<ActionResult<KindeUserDto | null>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get user by ID from Kinde",
            apiResult.error,
            "KindeUserService.getUserById"
          )
        );
      }

      const UsersApi = apiResult.value;
      const response = await UsersApi.getUserData({ id: kindeUserId });

      if (!response) {
        return ok(null);
      }

      const user: KindeUserDto = {
        id: response.id || kindeUserId,
        email: response.preferred_email || null,
        given_name: response.first_name || null,
        family_name: response.last_name || null,
        picture: response.picture || null,
        is_suspended: response.is_suspended,
        created_on: response.created_on || undefined,
        last_signed_in: response.last_signed_in || undefined,
      };

      return ok(user);
    } catch (error) {
      logger.error(
        "Failed to get user by ID from Kinde",
        { kindeUserId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get user by ID from Kinde",
          error as Error,
          "KindeUserService.getUserById"
        )
      );
    }
  }

  /**
   * Get all users in an organization
   */
  static async getUsersByOrganization(
    orgCode: string
  ): Promise<ActionResult<KindeOrganizationUserDto[]>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get users for organization",
            apiResult.error,
            "KindeUserService.getUsersByOrganization"
          )
        );
      }

      const OrganizationsApi = apiResult.value;
      const response = await OrganizationsApi.getOrganizationUsers({
        orgCode,
      });

      if (!response?.organization_users) {
        return ok([]);
      }

      const users: KindeOrganizationUserDto[] = response.organization_users.map(
        (user) => ({
          id: user.id || "",
          email: user.email || null,
          given_name: user.first_name || null,
          family_name: user.last_name || null,
          roles: user.roles || [],
        })
      );

      return ok(users);
    } catch (error) {
      logger.error(
        "Failed to get users for organization",
        { orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get users for organization",
          error as Error,
          "KindeUserService.getUsersByOrganization"
        )
      );
    }
  }

  /**
   * Create a new user in Kinde
   */
  static async createUser(
    data: CreateKindeUserDto
  ): Promise<ActionResult<KindeUserDto>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to create user in Kinde",
            apiResult.error,
            "KindeUserService.createUser"
          )
        );
      }

      const UsersApi = apiResult.value;
      const response = await UsersApi.createUser({
        requestBody: data,
      });

      if (!response?.id) {
        return err(
          ActionErrors.internal(
            "Failed to create user - no ID returned",
            undefined,
            "KindeUserService.createUser"
          )
        );
      }

      const user: KindeUserDto = {
        id: response.id,
        email: data.identities?.[0]?.details?.email || null,
        given_name: data.profile?.given_name || null,
        family_name: data.profile?.family_name || null,
        picture: null,
      };

      logger.info("Successfully created user in Kinde", {
        userId: user.id,
        email: user.email,
      });

      return ok(user);
    } catch (error) {
      logger.error("Failed to create user in Kinde", { data }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create user in Kinde",
          error as Error,
          "KindeUserService.createUser"
        )
      );
    }
  }

  /**
   * Update a user in Kinde
   */
  static async updateUser(
    kindeUserId: string,
    data: UpdateKindeUserDto
  ): Promise<ActionResult<KindeUserDto>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to update user in Kinde",
            apiResult.error,
            "KindeUserService.updateUser"
          )
        );
      }

      const UsersApi = apiResult.value;
      await UsersApi.updateUser({
        id: kindeUserId,
        requestBody: data,
      });

      // Fetch the updated user
      const updatedUserResult = await this.getUserById(kindeUserId);

      if (updatedUserResult.isErr()) {
        return err(updatedUserResult.error);
      }

      if (!updatedUserResult.value) {
        return err(
          ActionErrors.notFound("User", "KindeUserService.updateUser")
        );
      }

      logger.info("Successfully updated user in Kinde", {
        userId: kindeUserId,
      });

      return ok(updatedUserResult.value);
    } catch (error) {
      logger.error(
        "Failed to update user in Kinde",
        { kindeUserId, data },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update user in Kinde",
          error as Error,
          "KindeUserService.updateUser"
        )
      );
    }
  }

  /**
   * Delete a user from Kinde
   */
  static async deleteUser(kindeUserId: string): Promise<ActionResult<boolean>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to delete user from Kinde",
            apiResult.error,
            "KindeUserService.deleteUser"
          )
        );
      }

      const UsersApi = apiResult.value;
      await UsersApi.deleteUser({
        id: kindeUserId,
      });

      logger.info("Successfully deleted user from Kinde", {
        userId: kindeUserId,
      });

      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to delete user from Kinde",
        { kindeUserId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to delete user from Kinde",
          error as Error,
          "KindeUserService.deleteUser"
        )
      );
    }
  }

  /**
   * Add a user to an organization
   */
  static async addUserToOrganization(
    kindeUserId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to add user to organization",
            apiResult.error,
            "KindeUserService.addUserToOrganization"
          )
        );
      }

      const OrganizationsApi = apiResult.value;
      await OrganizationsApi.addOrganizationUsers({
        orgCode,
        requestBody: {
          users: [{ id: kindeUserId }],
        },
      });

      logger.info("Successfully added user to organization", {
        userId: kindeUserId,
        orgCode,
      });

      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to add user to organization",
        { kindeUserId, orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to add user to organization",
          error as Error,
          "KindeUserService.addUserToOrganization"
        )
      );
    }
  }

  /**
   * Remove a user from an organization
   */
  static async removeUserFromOrganization(
    kindeUserId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to remove user from organization",
            apiResult.error,
            "KindeUserService.removeUserFromOrganization"
          )
        );
      }

      const OrganizationsApi = apiResult.value;
      await OrganizationsApi.removeOrganizationUser({
        orgCode,
        userId: kindeUserId,
      });

      logger.info("Successfully removed user from organization", {
        userId: kindeUserId,
        orgCode,
      });

      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to remove user from organization",
        { kindeUserId, orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to remove user from organization",
          error as Error,
          "KindeUserService.removeUserFromOrganization"
        )
      );
    }
  }
}

