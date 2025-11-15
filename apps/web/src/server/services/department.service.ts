import { err, ok } from "neverthrow";
import {
  ActionErrors,
  type ActionResult,
  isActionError,
} from "../../lib/action-errors";
import { getAuthSession } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import { assertOrganizationAccess } from "../../lib/organization-isolation";
import { logger } from "../../lib/logger";
import { DepartmentQueries } from "../data-access/departments.queries";
import type { Department } from "../db/schema";
import type {
  CreateDepartmentDto,
  DepartmentDto,
  UpdateDepartmentDto,
} from "../dto/department.dto";

/**
 * Business logic layer for Department operations
 * Orchestrates data access and handles business rules
 */
export class DepartmentService {
  /**
   * Get all departments for an organization
   */
  static async getDepartmentsByOrganization(
    organizationId: string
  ): Promise<ActionResult<DepartmentDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "DepartmentService.getDepartmentsByOrganization"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "DepartmentService.getDepartmentsByOrganization"
          )
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        organizationId,
        organization.orgCode,
        "DepartmentService.getDepartmentsByOrganization"
      );

      const departments = await DepartmentQueries.selectDepartmentsByOrganization(
        organizationId
      );

      const departmentDtos: DepartmentDto[] = departments.map((dept) => ({
        id: dept.id,
        organizationId: dept.organizationId,
        name: dept.name,
        description: dept.description,
        parentDepartmentId: dept.parentDepartmentId,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt,
      }));

      return ok(departmentDtos);
    } catch (error) {
      // Preserve ActionErrors thrown by assertOrganizationAccess
      if (isActionError(error)) {
        return err(error);
      }
      logger.error(
        "Failed to get departments",
        { organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get departments",
          error as Error,
          "DepartmentService.getDepartmentsByOrganization"
        )
      );
    }
  }

  /**
   * Get a department by ID
   */
  static async getDepartmentById(
    id: string
  ): Promise<ActionResult<DepartmentDto | null>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "DepartmentService.getDepartmentById"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "DepartmentService.getDepartmentById"
          )
        );
      }

      const department = await DepartmentQueries.selectDepartmentById(id);

      if (!department) {
        return ok(null);
      }

      // Verify organization access
      assertOrganizationAccess(
        department.organizationId,
        organization.orgCode,
        "DepartmentService.getDepartmentById"
      );

      const departmentDto: DepartmentDto = {
        id: department.id,
        organizationId: department.organizationId,
        name: department.name,
        description: department.description,
        parentDepartmentId: department.parentDepartmentId,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      };

      return ok(departmentDto);
    } catch (error) {
      // Preserve ActionErrors thrown by assertOrganizationAccess
      if (isActionError(error)) {
        return err(error);
      }
      logger.error("Failed to get department", { id }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get department",
          error as Error,
          "DepartmentService.getDepartmentById"
        )
      );
    }
  }

  /**
   * Create a new department
   */
  static async createDepartment(
    data: CreateDepartmentDto
  ): Promise<ActionResult<DepartmentDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "DepartmentService.createDepartment"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "DepartmentService.createDepartment"
          )
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        data.organizationId,
        organization.orgCode,
        "DepartmentService.createDepartment"
      );

      // Validate parent department if provided
      if (data.parentDepartmentId) {
        const parent = await DepartmentQueries.selectDepartmentById(
          data.parentDepartmentId
        );
        if (!parent) {
          return err(
            ActionErrors.badRequest(
              "Parent department not found",
              "DepartmentService.createDepartment"
            )
          );
        }
        if (parent.organizationId !== data.organizationId) {
          return err(
            ActionErrors.badRequest(
              "Parent department must be in the same organization",
              "DepartmentService.createDepartment"
            )
          );
        }
      }

      const department = await DepartmentQueries.insertDepartment(data);

      // Invalidate cache
      CacheInvalidation.invalidateDepartmentCache(data.organizationId);

      const departmentDto: DepartmentDto = {
        id: department.id,
        organizationId: department.organizationId,
        name: department.name,
        description: department.description,
        parentDepartmentId: department.parentDepartmentId,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      };

      return ok(departmentDto);
    } catch (error) {
      // Preserve ActionErrors thrown by assertOrganizationAccess
      if (isActionError(error)) {
        return err(error);
      }
      logger.error("Failed to create department", { data }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create department",
          error as Error,
          "DepartmentService.createDepartment"
        )
      );
    }
  }

  /**
   * Update a department
   */
  static async updateDepartment(
    id: string,
    data: UpdateDepartmentDto
  ): Promise<ActionResult<DepartmentDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "DepartmentService.updateDepartment"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "DepartmentService.updateDepartment"
          )
        );
      }

      const existing = await DepartmentQueries.selectDepartmentById(id);
      if (!existing) {
        return err(
          ActionErrors.notFound("Department", "DepartmentService.updateDepartment")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        existing.organizationId,
        organization.orgCode,
        "DepartmentService.updateDepartment"
      );

      // Validate parent department if provided
      if (data.parentDepartmentId !== undefined) {
        if (data.parentDepartmentId === id) {
          return err(
            ActionErrors.badRequest(
              "Department cannot be its own parent",
              "DepartmentService.updateDepartment"
            )
          );
        }
        if (data.parentDepartmentId) {
          const parent = await DepartmentQueries.selectDepartmentById(
            data.parentDepartmentId
          );
          if (!parent) {
            return err(
              ActionErrors.badRequest(
                "Parent department not found",
                "DepartmentService.updateDepartment"
              )
            );
          }
          if (parent.organizationId !== existing.organizationId) {
            return err(
              ActionErrors.badRequest(
                "Parent department must be in the same organization",
                "DepartmentService.updateDepartment"
              )
            );
          }
        }
      }

      const department = await DepartmentQueries.updateDepartment(id, data);

      // Invalidate cache
      CacheInvalidation.invalidateDepartmentCache(existing.organizationId);

      const departmentDto: DepartmentDto = {
        id: department.id,
        organizationId: department.organizationId,
        name: department.name,
        description: department.description,
        parentDepartmentId: department.parentDepartmentId,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      };

      return ok(departmentDto);
    } catch (error) {
      // Preserve ActionErrors thrown by assertOrganizationAccess
      if (isActionError(error)) {
        return err(error);
      }
      logger.error("Failed to update department", { id, data }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update department",
          error as Error,
          "DepartmentService.updateDepartment"
        )
      );
    }
  }

  /**
   * Delete a department
   */
  static async deleteDepartment(id: string): Promise<ActionResult<void>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "DepartmentService.deleteDepartment"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "DepartmentService.deleteDepartment"
          )
        );
      }

      const existing = await DepartmentQueries.selectDepartmentById(id);
      if (!existing) {
        return err(
          ActionErrors.notFound("Department", "DepartmentService.deleteDepartment")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        existing.organizationId,
        organization.orgCode,
        "DepartmentService.deleteDepartment"
      );

      // Check for child departments
      const children = await DepartmentQueries.selectChildDepartments(id);
      if (children.length > 0) {
        return err(
          ActionErrors.badRequest(
            "Cannot delete department with child departments",
            "DepartmentService.deleteDepartment"
          )
        );
      }

      await DepartmentQueries.deleteDepartment(id);

      // Invalidate cache
      CacheInvalidation.invalidateDepartmentCache(existing.organizationId);

      return ok(undefined);
    } catch (error) {
      // Preserve ActionErrors thrown by assertOrganizationAccess
      if (isActionError(error)) {
        return err(error);
      }
      logger.error("Failed to delete department", { id }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to delete department",
          error as Error,
          "DepartmentService.deleteDepartment"
        )
      );
    }
  }
}

