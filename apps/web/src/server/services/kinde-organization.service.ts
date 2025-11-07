import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
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
  ): Promise<ActionResult<KindeOrganizationDto | null>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get organization from Kinde",
            apiResult.error,
            "KindeOrganizationService.getOrganizationById"
          )
        );
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
      logger.error(
        "Failed to get organization from Kinde",
        { orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get organization from Kinde",
          error as Error,
          "KindeOrganizationService.getOrganizationById"
        )
      );
    }
  }

  /**
   * Get all organizations
   */
  static async getAllOrganizations(): Promise<
    ActionResult<KindeOrganizationDto[]>
  > {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get organizations from Kinde",
            apiResult.error,
            "KindeOrganizationService.getAllOrganizations"
          )
        );
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
      logger.error(
        "Failed to get organizations from Kinde",
        {},
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get organizations from Kinde",
          error as Error,
          "KindeOrganizationService.getAllOrganizations"
        )
      );
    }
  }

  /**
   * Create a new organization in Kinde
   */
  static async createOrganization(
    data: CreateKindeOrganizationDto
  ): Promise<ActionResult<KindeOrganizationDto>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to create organization from Kinde",
            apiResult.error,
            "KindeOrganizationService.createOrganization"
          )
        );
      }

      const OrganizationsApi = apiResult.value;
      const response = await OrganizationsApi.createOrganization({
        requestBody: data,
      });

      if (!response?.organization?.code) {
        return err(
          ActionErrors.internal(
            "Failed to create organization - no code returned",
            undefined,
            "KindeOrganizationService.createOrganization"
          )
        );
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
      logger.error(
        "Failed to create organization in Kinde",
        { data },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create organization in Kinde",
          error as Error,
          "KindeOrganizationService.createOrganization"
        )
      );
    }
  }

  /**
   * Update an organization in Kinde
   */
  static async updateOrganization(
    orgCode: string,
    data: UpdateKindeOrganizationDto
  ): Promise<ActionResult<KindeOrganizationDto>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to update organization from Kinde",
            apiResult.error,
            "KindeOrganizationService.updateOrganization"
          )
        );
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
        return err(
          ActionErrors.notFound(
            "Organization",
            "KindeOrganizationService.updateOrganization"
          )
        );
      }

      logger.info("Successfully updated organization in Kinde", {
        orgCode,
      });

      return ok(updatedOrgResult.value);
    } catch (error) {
      logger.error(
        "Failed to update organization in Kinde",
        { orgCode, data },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update organization in Kinde",
          error as Error,
          "KindeOrganizationService.updateOrganization"
        )
      );
    }
  }

  /**
   * Delete an organization from Kinde
   */
  static async deleteOrganization(
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    try {
      const client = getKindeApiClient();
      const apiResult = await client.getOrganizationsApi();

      if (apiResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to delete organization from Kinde",
            apiResult.error,
            "KindeOrganizationService.deleteOrganization"
          )
        );
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
      logger.error(
        "Failed to delete organization from Kinde",
        { orgCode },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to delete organization from Kinde",
          error as Error,
          "KindeOrganizationService.deleteOrganization"
        )
      );
    }
  }
}

