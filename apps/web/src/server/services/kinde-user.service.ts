import { type Result, err, ok } from "neverthrow";
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
  ): Promise<Result<KindeUserDto | null, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
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
      const errorMessage = `Failed to get user by ID from Kinde: ${kindeUserId}`;
      logger.error(errorMessage, { kindeUserId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get all users in an organization
   */
  static async getUsersByOrganization(
    orgCode: string
  ): Promise<Result<KindeOrganizationUserDto[], string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
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
      const errorMessage = `Failed to get users for organization: ${orgCode}`;
      logger.error(errorMessage, { orgCode }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Create a new user in Kinde
   */
  static async createUser(
    data: CreateKindeUserDto
  ): Promise<Result<KindeUserDto, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
      }

      const UsersApi = apiResult.value;
      const response = await UsersApi.createUser({
        requestBody: data,
      });

      if (!response?.id) {
        return err("Failed to create user - no ID returned");
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
      const errorMessage = "Failed to create user in Kinde";
      logger.error(errorMessage, { data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update a user in Kinde
   */
  static async updateUser(
    kindeUserId: string,
    data: UpdateKindeUserDto
  ): Promise<Result<KindeUserDto, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
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
        return err("User not found after update");
      }

      logger.info("Successfully updated user in Kinde", {
        userId: kindeUserId,
      });

      return ok(updatedUserResult.value);
    } catch (error) {
      const errorMessage = `Failed to update user in Kinde: ${kindeUserId}`;
      logger.error(errorMessage, { kindeUserId, data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Delete a user from Kinde
   */
  static async deleteUser(
    kindeUserId: string
  ): Promise<Result<boolean, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getUsersApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
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
      const errorMessage = `Failed to delete user from Kinde: ${kindeUserId}`;
      logger.error(errorMessage, { kindeUserId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Add a user to an organization
   */
  static async addUserToOrganization(
    kindeUserId: string,
    orgCode: string
  ): Promise<Result<boolean, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
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
      const errorMessage = `Failed to add user to organization: ${kindeUserId} -> ${orgCode}`;
      logger.error(errorMessage, { kindeUserId, orgCode }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Remove a user from an organization
   */
  static async removeUserFromOrganization(
    kindeUserId: string,
    orgCode: string
  ): Promise<Result<boolean, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
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
      const errorMessage = `Failed to remove user from organization: ${kindeUserId} -> ${orgCode}`;
      logger.error(errorMessage, { kindeUserId, orgCode }, error as Error);
      return err(errorMessage);
    }
  }
}

