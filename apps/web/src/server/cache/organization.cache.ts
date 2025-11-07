"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { KindeUserService } from "../services/kinde-user.service";

/**
 * Cached organization queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get organization users (cached)
 * Calls KindeUserService which fetches from Kinde Management API
 */
export async function getCachedOrganizationUsers(orgCode: string) {
  "use cache";
  cacheTag(CacheTags.orgMembers(orgCode));
  return await KindeUserService.getUsersByOrganization(orgCode);
}

