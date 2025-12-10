import { db } from "@/server/db";
import {
  onboardings,
  type NewOnboarding,
  type Onboarding,
} from "@/server/db/schema/onboardings";
import { and, avg, count, eq, sql } from "drizzle-orm";

/**
 * Type definitions for Onboarding queries
 */

export interface CreateOnboardingData {
  userId?: string;
  organizationId?: string;
  signupType: "individual" | "organization";
  orgSize?: number;
  referralSource?: string;
  signupMethod: "email" | "google" | "microsoft" | "magic_link" | "passkey";
}

export interface UpdateOnboardingData {
  signupType?: "individual" | "organization";
  orgSize?: number | null;
  researchQuestion?: string | null;
  referralSource?: string | null;
  referralSourceOther?: string | null;
  googleCalendarConnectedDuringOnboarding?: boolean;
  newsletterOptIn?: boolean | null;
  organizationId?: string | null;
}

export interface OnboardingStats {
  totalSignups: number;
  individualSignups: number;
  organizationSignups: number;
  signupMethods: Record<string, number>;
  referralSources: Record<string, number>;
  averageOrgSize: number;
}

/**
 * Database queries for Onboarding operations
 * Pure data access layer - no business logic
 */
export class OnboardingQueries {
  /**
   * Create a new onboarding record
   */
  static async createOnboarding(
    data: CreateOnboardingData
  ): Promise<Onboarding> {
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

    return inserted ?? null;
  }

  /**
   * Get onboarding record by ID
   */
  static async getOnboardingById(id: string): Promise<Onboarding | null> {
    const [onboarding] = await db
      .select()
      .from(onboardings)
      .where(eq(onboardings.id, id))
      .limit(1);

    return onboarding ?? null;
  }

  /**
   * Get onboarding record by user ID
   */
  static async getOnboardingByUserId(
    userId: string
  ): Promise<Onboarding | null> {
    const [onboarding] = await db
      .select()
      .from(onboardings)
      .where(eq(onboardings.userId, userId))
      .limit(1);

    return onboarding ?? null;
  }

  /**
   * Get onboarding record by organization ID
   */
  static async getOnboardingByOrganizationId(
    organizationId: string
  ): Promise<Onboarding | null> {
    const [onboarding] = await db
      .select()
      .from(onboardings)
      .where(eq(onboardings.organizationId, organizationId))
      .limit(1);

    return onboarding ?? null;
  }

  /**
   * Get aggregated onboarding statistics
   */
  static async getOnboardingStats(): Promise<OnboardingStats> {
    // Get total signups
    const [totalResult] = await db.select({ count: count() }).from(onboardings);

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
  }

  /**
   * Update onboarding completion status
   */
  static async updateOnboardingCompleted(
    id: string,
    completed: boolean
  ): Promise<void> {
    await db
      .update(onboardings)
      .set({
        onboardingCompleted: completed,
        updatedAt: new Date(),
      })
      .where(eq(onboardings.id, id));
  }

  /**
   * Update onboarding data
   */
  static async updateOnboardingData(
    id: string,
    data: UpdateOnboardingData
  ): Promise<Onboarding> {
    // Build update object, only including fields that are explicitly provided
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.signupType !== undefined) {
      updateData.signupType = data.signupType;
    }
    if (data.orgSize !== undefined) {
      updateData.orgSize = data.orgSize;
    }
    if (data.researchQuestion !== undefined) {
      updateData.researchQuestion = data.researchQuestion;
    }
    if (data.referralSource !== undefined) {
      updateData.referralSource = data.referralSource;
    }
    if (data.referralSourceOther !== undefined) {
      updateData.referralSourceOther = data.referralSourceOther;
    }
    if (data.googleCalendarConnectedDuringOnboarding !== undefined) {
      updateData.googleCalendarConnectedDuringOnboarding =
        data.googleCalendarConnectedDuringOnboarding;
    }
    // Only include newsletterOptIn if it's explicitly provided as a boolean (not null)
    if (data.newsletterOptIn !== undefined && data.newsletterOptIn !== null) {
      updateData.newsletterOptIn = data.newsletterOptIn;
    }
    if (data.organizationId !== undefined) {
      updateData.organizationId = data.organizationId;
    }

    const [updated] = await db
      .update(onboardings)
      .set(updateData)
      .where(eq(onboardings.id, id))
      .returning();

    return updated ?? null;
  }
}

