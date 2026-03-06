import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "../db";
import {
  type GuardrailsPolicy,
  type NewGuardrailsViolation,
  guardrailsPolicies,
  guardrailsViolations,
} from "../db/schema";
import type {
  GetGuardrailsViolationsInput,
  UpdateGuardrailsPolicyInput,
} from "../validation/guardrails.validation";

export class GuardrailsQueries {
  static async getPolicyByScope(
    scope: "default" | "organization" | "project",
    scopeId: string | null
  ): Promise<GuardrailsPolicy | undefined> {
    const conditions = [eq(guardrailsPolicies.scope, scope)];

    if (scopeId) {
      conditions.push(eq(guardrailsPolicies.scopeId, scopeId));
    } else {
      conditions.push(sql`${guardrailsPolicies.scopeId} IS NULL`);
    }

    const [policy] = await db
      .select()
      .from(guardrailsPolicies)
      .where(and(...conditions))
      .limit(1);

    return policy;
  }

  static async getDefaultPolicy(): Promise<GuardrailsPolicy | undefined> {
    return this.getPolicyByScope("default", null);
  }

  static async getOrganizationPolicy(
    orgId: string
  ): Promise<GuardrailsPolicy | undefined> {
    return this.getPolicyByScope("organization", orgId);
  }

  static async getProjectPolicy(
    projectId: string
  ): Promise<GuardrailsPolicy | undefined> {
    return this.getPolicyByScope("project", projectId);
  }

  static async upsertPolicy(
    input: UpdateGuardrailsPolicyInput & { createdBy?: string }
  ): Promise<GuardrailsPolicy> {
    const { scope, scopeId, createdBy, ...fields } = input;

    const updateFields: Record<string, unknown> = {
      ...fields,
      updatedAt: new Date(),
    };

    const [result] = await db
      .insert(guardrailsPolicies)
      .values({
        scope,
        scopeId,
        createdBy,
        ...fields,
      })
      .onConflictDoUpdate({
        target: [guardrailsPolicies.scope, guardrailsPolicies.scopeId],
        set: updateFields,
      })
      .returning();

    return result;
  }

  static async insertViolation(
    violation: NewGuardrailsViolation
  ): Promise<void> {
    await db.insert(guardrailsViolations).values(violation);
  }

  static async getViolations(input: GetGuardrailsViolationsInput): Promise<{
    violations: (typeof guardrailsViolations.$inferSelect)[];
    total: number;
  }> {
    const conditions = [
      eq(guardrailsViolations.organizationId, input.organizationId),
    ];

    if (input.projectId) {
      conditions.push(eq(guardrailsViolations.projectId, input.projectId));
    }
    if (input.violationType) {
      conditions.push(
        eq(guardrailsViolations.violationType, input.violationType)
      );
    }
    if (input.direction) {
      conditions.push(eq(guardrailsViolations.direction, input.direction));
    }
    if (input.severity) {
      conditions.push(eq(guardrailsViolations.severity, input.severity));
    }
    if (input.startDate) {
      conditions.push(
        gte(guardrailsViolations.createdAt, new Date(input.startDate))
      );
    }
    if (input.endDate) {
      conditions.push(
        lte(guardrailsViolations.createdAt, new Date(input.endDate))
      );
    }

    const where = and(...conditions);
    const offset = (input.page - 1) * input.limit;

    const [violations, [countRow]] = await Promise.all([
      db
        .select()
        .from(guardrailsViolations)
        .where(where)
        .orderBy(desc(guardrailsViolations.createdAt))
        .limit(input.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(guardrailsViolations)
        .where(where),
    ]);

    return { violations, total: countRow?.count ?? 0 };
  }

  static async getViolationCountsByType(
    organizationId: string,
    since: Date
  ): Promise<Record<string, number>> {
    const rows = await db
      .select({
        type: guardrailsViolations.violationType,
        count: sql<number>`count(*)::int`,
      })
      .from(guardrailsViolations)
      .where(
        and(
          eq(guardrailsViolations.organizationId, organizationId),
          gte(guardrailsViolations.createdAt, since)
        )
      )
      .groupBy(guardrailsViolations.violationType);

    return Object.fromEntries(rows.map((r) => [r.type, r.count]));
  }
}
