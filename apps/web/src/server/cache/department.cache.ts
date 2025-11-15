"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { DepartmentService } from "../services/department.service";

/**
 * Cached department queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get departments by organization (cached)
 * Calls DepartmentService which includes business logic and auth checks
 */
export async function getCachedDepartmentsByOrganization(
  organizationId: string
) {
  "use cache";
  cacheTag(CacheTags.departmentsByOrg(organizationId));

  const departments = await DepartmentService.getDepartmentsByOrganization(
    organizationId
  );

  if (departments.isOk()) {
    return departments.value;
  }

  return [];
}

/**
 * Get department by ID (cached)
 * Calls DepartmentService which includes business logic and auth checks
 */
export async function getCachedDepartmentById(id: string) {
  "use cache";
  cacheTag(CacheTags.department(id));

  const department = await DepartmentService.getDepartmentById(id);

  if (department.isOk()) {
    return department.value;
  }

  return null;
}

