import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  worksCouncilApprovals,
  type NewWorksCouncilApproval,
  type WorksCouncilApproval,
} from "../db/schema/works-council-approvals";

export class WorksCouncilQueries {
  static async create(
    data: NewWorksCouncilApproval,
  ): Promise<WorksCouncilApproval> {
    const rows = await db
      .insert(worksCouncilApprovals)
      .values(data)
      .returning();

    if (!rows[0]) {
      throw new Error(
        "Failed to create works council approval: no row returned",
      );
    }

    return rows[0];
  }

  static async findActiveByOrganization(
    organizationId: string,
  ): Promise<WorksCouncilApproval | null> {
    const [approval] = await db
      .select()
      .from(worksCouncilApprovals)
      .where(
        and(
          eq(worksCouncilApprovals.organizationId, organizationId),
          eq(worksCouncilApprovals.status, "active"),
        ),
      )
      .orderBy(desc(worksCouncilApprovals.approvalDate))
      .limit(1);
    return approval ?? null;
  }

  static async findAllByOrganization(
    organizationId: string,
  ): Promise<WorksCouncilApproval[]> {
    return await db
      .select()
      .from(worksCouncilApprovals)
      .where(eq(worksCouncilApprovals.organizationId, organizationId))
      .orderBy(desc(worksCouncilApprovals.approvalDate));
  }

  static async revoke(
    id: string,
    revokedBy: string,
  ): Promise<WorksCouncilApproval | null> {
    const [updated] = await db
      .update(worksCouncilApprovals)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revokedBy,
        updatedAt: new Date(),
      })
      .where(eq(worksCouncilApprovals.id, id))
      .returning();
    return updated ?? null;
  }
}
