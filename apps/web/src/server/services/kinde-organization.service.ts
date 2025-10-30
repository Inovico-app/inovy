import { type Result, err, ok } from "neverthrow";
import { getKindeApiClient } from "../../lib/kinde-api";
import { logger } from "../../lib/logger";
import type {
  CreateKindeOrganizationDto,
  KindeOrganizationDto,
  UpdateKindeOrganizationDto,
} from "../dto/kinde.dto";

/**
 * Kinde Organization Service
 * Handles all organization operations via Kinde Management API
 */

export class KindeOrganizationService {
  /**
   * Get an organization by its code
   */
  static async getOrganizationById(
    orgCode: string
  ): Promise<Result<KindeOrganizationDto | null, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
      }

      const OrganizationsApi = apiResult.value;
      const response = await OrganizationsApi.getOrganization({
        code: orgCode,
      });

      if (!response) {
        return ok(null);
      }

      const organization: KindeOrganizationDto = {
        code: response.code || orgCode,
        name: response.name || "",
        is_default: response.is_default,
        created_on: response.created_on,
      };

      return ok(organization);
    } catch (error) {
      const errorMessage = `Failed to get organization from Kinde: ${orgCode}`;
      logger.error(errorMessage, { orgCode }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get all organizations
   */
  static async getAllOrganizations(): Promise<
    Result<KindeOrganizationDto[], string>
  > {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
      }

      const OrganizationsApi = apiResult.value;
      const response = await OrganizationsApi.getOrganizations();

      if (!response?.organizations) {
        return ok([]);
      }

      const organizations: KindeOrganizationDto[] = response.organizations.map(
        (org) => ({
          code: org.code || "",
          name: org.name || "",
          is_default: org.is_default,
        })
      );

      return ok(organizations);
    } catch (error) {
      const errorMessage = "Failed to get organizations from Kinde";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Create a new organization in Kinde
   */
  static async createOrganization(
    data: CreateKindeOrganizationDto
  ): Promise<Result<KindeOrganizationDto, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
      }

      const OrganizationsApi = apiResult.value;
      const response = await OrganizationsApi.createOrganization({
        requestBody: data,
      });

      if (!response?.organization?.code) {
        return err("Failed to create organization - no code returned");
      }

      const organization: KindeOrganizationDto = {
        code: response.organization.code,
        name: data.name,
        is_default: false,
      };

      logger.info("Successfully created organization in Kinde", {
        orgCode: organization.code,
        name: organization.name,
      });

      return ok(organization);
    } catch (error) {
      const errorMessage = "Failed to create organization in Kinde";
      logger.error(errorMessage, { data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update an organization in Kinde
   */
  static async updateOrganization(
    orgCode: string,
    data: UpdateKindeOrganizationDto
  ): Promise<Result<KindeOrganizationDto, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
      }

      const OrganizationsApi = apiResult.value;
      await OrganizationsApi.updateOrganization({
        orgCode,
        requestBody: data,
      });

      // Fetch the updated organization
      const updatedOrgResult = await this.getOrganizationById(orgCode);

      if (updatedOrgResult.isErr()) {
        return err(updatedOrgResult.error);
      }

      if (!updatedOrgResult.value) {
        return err("Organization not found after update");
      }

      logger.info("Successfully updated organization in Kinde", {
        orgCode,
      });

      return ok(updatedOrgResult.value);
    } catch (error) {
      const errorMessage = `Failed to update organization in Kinde: ${orgCode}`;
      logger.error(errorMessage, { orgCode, data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Delete an organization from Kinde
   */
  static async deleteOrganization(
    orgCode: string
  ): Promise<Result<boolean, string>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(apiResult.error);
      }

      const OrganizationsApi = apiResult.value;
      await OrganizationsApi.deleteOrganization({
        orgCode,
      });

      logger.info("Successfully deleted organization from Kinde", {
        orgCode,
      });

      return ok(true);
    } catch (error) {
      const errorMessage = `Failed to delete organization from Kinde: ${orgCode}`;
      logger.error(errorMessage, { orgCode }, error as Error);
      return err(errorMessage);
    }
  }
}

