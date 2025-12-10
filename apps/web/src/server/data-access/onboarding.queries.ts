import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import {
  onboardings,
  type NewOnboarding,
  type Onboarding,
} from "@/server/db/schema/onboardings";
import { and, avg, count, eq, sql } from "drizzle-orm";

/**
 * Database queries for Onboarding operations
 * Pure data access layer - no business logic
 */
export class OnboardingQueries {
  /**
   * Create a new onboarding record
   */
  static async createOnboarding(data: {
    userId?: string;
    organizationId?: string;
    signupType: "individual" | "organization";
    orgSize?: number;
    referralSource?: string;
    signupMethod: "email" | "google" | "microsoft" | "magic_link" | "passkey";
  }): Promise<Onboarding> {
    try {
      // Validate that either userId or organizationId is provided
      if (!data.userId && !data.organizationId) {
        throw new Error(
          "Either userId or organizationId must be provided for onboarding record"
        );
      }

      const newOnboarding: NewOnboarding = {
        userId: data.userId ?? null,
        organizationId: data.organizationId ?? null,
        signupType: data.signupType,
        orgSize: data.orgSize ?? null,
        referralSource: data.referralSource ?? null,
        signupMethod: data.signupMethod,
        onboardingCompleted: false,
      };

      const [inserted] = await db
        .insert(onboardings)
        .values(newOnboarding)
        .returning();

      if (!inserted) {
        throw new Error("Failed to create onboarding record");
      }

      logger.info("Created onboarding record", {
        onboardingId: inserted.id,
        signupType: inserted.signupType,
        signupMethod: inserted.signupMethod,
      });

      return inserted;
    } catch (error) {
      logger.error("Error creating onboarding record", { error, data });
      throw error;
    }
  }

  /**
   * Get onboarding record by user ID
   */
  static async getOnboardingByUserId(
    userId: string
  ): Promise<Onboarding | null> {
    try {
      const [onboarding] = await db
        .select()
        .from(onboardings)
        .where(eq(onboardings.userId, userId))
        .limit(1);

      return onboarding ?? null;
    } catch (error) {
      logger.error("Error getting onboarding by user ID", { error, userId });
      throw error;
    }
  }

  /**
   * Get onboarding record by organization ID
   */
  static async getOnboardingByOrganizationId(
    organizationId: string
  ): Promise<Onboarding | null> {
    try {
      const [onboarding] = await db
        .select()
        .from(onboardings)
        .where(eq(onboardings.organizationId, organizationId))
        .limit(1);

      return onboarding ?? null;
    } catch (error) {
      logger.error("Error getting onboarding by organization ID", {
        error,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get aggregated onboarding statistics
   */
  static async getOnboardingStats(): Promise<{
    totalSignups: number;
    individualSignups: number;
    organizationSignups: number;
    signupMethods: Record<string, number>;
    referralSources: Record<string, number>;
    averageOrgSize: number;
  }> {
    try {
      // Get total signups
      const [totalResult] = await db
        .select({ count: count() })
        .from(onboardings);

      // Get signups by type
      const [individualResult] = await db
        .select({ count: count() })
        .from(onboardings)
        .where(eq(onboardings.signupType, "individual"));

      const [organizationResult] = await db
        .select({ count: count() })
        .from(onboardings)
        .where(eq(onboardings.signupType, "organization"));

      // Get signups by method
      const signupMethodsResult = await db
        .select({
          method: onboardings.signupMethod,
          count: count(),
        })
        .from(onboardings)
        .groupBy(onboardings.signupMethod);

      // Get signups by referral source
      const referralSourcesResult = await db
        .select({
          source: onboardings.referralSource,
          count: count(),
        })
        .from(onboardings)
        .where(sql`${onboardings.referralSource} IS NOT NULL`)
        .groupBy(onboardings.referralSource);

      // Get average org size
      const [avgOrgSizeResult] = await db
        .select({
          avgSize: avg(onboardings.orgSize),
        })
        .from(onboardings)
        .where(
          and(
            eq(onboardings.signupType, "organization"),
            sql`${onboardings.orgSize} IS NOT NULL`
          )
        );

      // Transform results
      const signupMethods: Record<string, number> = {};
      signupMethodsResult.forEach((row) => {
        signupMethods[row.method] = Number(row.count);
      });

      const referralSources: Record<string, number> = {};
      referralSourcesResult.forEach((row) => {
        if (row.source) {
          referralSources[row.source] = Number(row.count);
        }
      });

      return {
        totalSignups: totalResult?.count ?? 0,
        individualSignups: individualResult?.count ?? 0,
        organizationSignups: organizationResult?.count ?? 0,
        signupMethods,
        referralSources,
        averageOrgSize: avgOrgSizeResult?.avgSize
          ? Number(avgOrgSizeResult.avgSize)
          : 0,
      };
    } catch (error) {
      logger.error("Error getting onboarding statistics", { error });
      throw error;
    }
  }

  /**
   * Update onboarding completion status
   */
  static async updateOnboardingCompleted(
    id: string,
    completed: boolean
  ): Promise<void> {
    try {
      await db
        .update(onboardings)
        .set({
          onboardingCompleted: completed,
          updatedAt: new Date(),
        })
        .where(eq(onboardings.id, id));

      logger.info("Updated onboarding completion status", {
        onboardingId: id,
        completed,
      });
    } catch (error) {
      logger.error("Error updating onboarding completion status", {
        error,
        id,
        completed,
      });
      throw error;
    }
  }
}

