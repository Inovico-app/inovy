import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "../db";
import { auditLogs } from "../db/schema/audit-logs";
import { members, users } from "../db/schema/auth";

export interface PrivilegedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  organizationId: string | null;
  lastActivity: Date | null;
  activityCount: number;
  createdAt: Date;
}

export interface PrivilegedAccessStats {
  totalSuperadmins: number;
  totalAdmins: number;
  totalManagers: number;
  inactiveCount: number;
  recentRoleChanges: number;
}

export class PrivilegedAccessQueries {
  static async getAllPrivilegedUsers(
    organizationId?: string
  ): Promise<PrivilegedUser[]> {
    if (organizationId) {
      const orgMembers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          role: members.role,
          organizationId: members.organizationId,
          createdAt: users.createdAt,
        })
        .from(members)
        .innerJoin(users, eq(users.id, members.userId))
        .where(
          and(
            eq(members.organizationId, organizationId),
            or(
              eq(members.role, "superadmin"),
              eq(members.role, "admin"),
              eq(members.role, "manager"),
              eq(members.role, "owner")
            )
          )
        );

      const userIds = orgMembers.map((m) => m.id);

      const activityData =
        userIds.length > 0
          ? await db
              .select({
                userId: auditLogs.userId,
                lastActivity: sql<Date>`MAX(${auditLogs.createdAt})`,
                activityCount: sql<number>`COUNT(*)::int`,
              })
              .from(auditLogs)
              .where(
                and(
                  inArray(auditLogs.userId, userIds),
                  eq(auditLogs.organizationId, organizationId)
                )
              )
              .groupBy(auditLogs.userId)
          : [];

      const activityMap = new Map(
        activityData.map((a) => [
          a.userId,
          { lastActivity: a.lastActivity, activityCount: a.activityCount },
        ])
      );

      return orgMembers.map((m) => ({
        id: m.id,
        email: m.email,
        name: m.name,
        image: m.image,
        role: m.role,
        organizationId: m.organizationId,
        lastActivity: activityMap.get(m.id)?.lastActivity ?? null,
        activityCount: activityMap.get(m.id)?.activityCount ?? 0,
        createdAt: m.createdAt,
      }));
    }

    const superadmins = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "superadmin"));

    const userIds = superadmins.map((u) => u.id);

    const activityData =
      userIds.length > 0
        ? await db
            .select({
              userId: auditLogs.userId,
              lastActivity: sql<Date>`MAX(${auditLogs.createdAt})`,
              activityCount: sql<number>`COUNT(*)::int`,
            })
            .from(auditLogs)
            .where(inArray(auditLogs.userId, userIds))
            .groupBy(auditLogs.userId)
        : [];

    const activityMap = new Map(
      activityData.map((a) => [
        a.userId,
        { lastActivity: a.lastActivity, activityCount: a.activityCount },
      ])
    );

    return superadmins.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      role: u.role ?? "user",
      organizationId: null,
      lastActivity: activityMap.get(u.id)?.lastActivity ?? null,
      activityCount: activityMap.get(u.id)?.activityCount ?? 0,
      createdAt: u.createdAt,
    }));
  }

  static async getPrivilegedAccessStats(
    organizationId?: string
  ): Promise<PrivilegedAccessStats> {
    const inactiveDays = 90;
    const recentDays = 30;
    const inactiveThreshold = new Date();
    inactiveThreshold.setDate(inactiveThreshold.getDate() - inactiveDays);

    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - recentDays);

    if (organizationId) {
      const [statsResult] = await db
        .select({
          totalAdmins: sql<number>`COUNT(CASE WHEN ${members.role} IN ('admin', 'owner') THEN 1 END)::int`,
          totalManagers: sql<number>`COUNT(CASE WHEN ${members.role} = 'manager' THEN 1 END)::int`,
        })
        .from(members)
        .where(
          and(
            eq(members.organizationId, organizationId),
            sql`${members.role} IN ('admin', 'manager', 'owner')`
          )
        );

      const userIds = await db
        .select({ userId: members.userId })
        .from(members)
        .where(
          and(
            eq(members.organizationId, organizationId),
            sql`${members.role} IN ('admin', 'manager', 'owner')`
          )
        );

      const ids = userIds.map((u) => u.userId);

      const [inactiveResult] =
        ids.length > 0
          ? await db
              .select({
                inactiveCount: sql<number>`COUNT(DISTINCT ${users.id})::int`,
              })
              .from(users)
              .leftJoin(
                auditLogs,
                and(
                  eq(auditLogs.userId, users.id),
                  eq(auditLogs.organizationId, organizationId),
                  gte(auditLogs.createdAt, inactiveThreshold)
                )
              )
              .where(
                and(
                  sql`${users.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`,
                  sql`${auditLogs.id} IS NULL`
                )
              )
          : [{ inactiveCount: 0 }];

      const [roleChangeResult] =
        ids.length > 0
          ? await db
              .select({
                recentRoleChanges: sql<number>`COUNT(*)::int`,
              })
              .from(auditLogs)
              .where(
                and(
                  eq(auditLogs.organizationId, organizationId),
                  sql`${auditLogs.eventType} IN ('role_assigned', 'role_removed')`,
                  gte(auditLogs.createdAt, recentThreshold)
                )
              )
          : [{ recentRoleChanges: 0 }];

      return {
        totalSuperadmins: 0,
        totalAdmins: statsResult?.totalAdmins ?? 0,
        totalManagers: statsResult?.totalManagers ?? 0,
        inactiveCount: inactiveResult?.inactiveCount ?? 0,
        recentRoleChanges: roleChangeResult?.recentRoleChanges ?? 0,
      };
    }

    const [superadminCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(eq(users.role, "superadmin"));

    const superadminIds = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "superadmin"));

    const ids = superadminIds.map((u) => u.id);

    const [inactiveResult] =
      ids.length > 0
        ? await db
            .select({
              inactiveCount: sql<number>`COUNT(DISTINCT ${users.id})::int`,
            })
            .from(users)
            .leftJoin(
              auditLogs,
              and(
                eq(auditLogs.userId, users.id),
                gte(auditLogs.createdAt, inactiveThreshold)
              )
            )
            .where(
              and(
                sql`${users.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`,
                sql`${auditLogs.id} IS NULL`
              )
            )
        : [{ inactiveCount: 0 }];

    const [roleChangeResult] =
      ids.length > 0
        ? await db
            .select({
              recentRoleChanges: sql<number>`COUNT(*)::int`,
            })
            .from(auditLogs)
            .where(
              and(
                sql`${auditLogs.eventType} IN ('role_assigned', 'role_removed')`,
                gte(auditLogs.createdAt, recentThreshold)
              )
            )
        : [{ recentRoleChanges: 0 }];

    return {
      totalSuperadmins: superadminCount?.count ?? 0,
      totalAdmins: 0,
      totalManagers: 0,
      inactiveCount: inactiveResult?.inactiveCount ?? 0,
      recentRoleChanges: roleChangeResult?.recentRoleChanges ?? 0,
    };
  }

  static async getRecentPrivilegedActions(
    organizationId: string,
    limit = 50
  ) {
    return await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        userId: auditLogs.userId,
        organizationId: auditLogs.organizationId,
        action: auditLogs.action,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        metadata: auditLogs.metadata,
        previousHash: auditLogs.previousHash,
        hash: auditLogs.hash,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          or(
            eq(auditLogs.eventType, "role_assigned" as never),
            eq(auditLogs.eventType, "role_removed" as never),
            eq(auditLogs.eventType, "user_created" as never),
            eq(auditLogs.eventType, "user_updated" as never),
            eq(auditLogs.eventType, "user_deleted" as never),
            eq(auditLogs.eventType, "user_deactivated" as never),
            eq(auditLogs.eventType, "user_activated" as never),
            eq(auditLogs.eventType, "permission_granted" as never),
            eq(auditLogs.eventType, "permission_revoked" as never),
            eq(auditLogs.eventType, "admin_access" as never),
            eq(auditLogs.eventType, "superadmin_access" as never),
            eq(auditLogs.eventType, "privileged_action" as never),
            eq(auditLogs.eventType, "organization_updated" as never),
            eq(auditLogs.eventType, "settings_updated" as never)
          )
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  static async getRoleChangeHistory(
    organizationId: string,
    userId?: string,
    limit = 50
  ) {
    const roleCondition = or(
      eq(auditLogs.eventType, "role_assigned" as never),
      eq(auditLogs.eventType, "role_removed" as never)
    );

    const conditions = userId
      ? and(
          eq(auditLogs.organizationId, organizationId),
          roleCondition,
          eq(auditLogs.userId, userId)
        )
      : and(eq(auditLogs.organizationId, organizationId), roleCondition);

    return await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        userId: auditLogs.userId,
        organizationId: auditLogs.organizationId,
        action: auditLogs.action,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        metadata: auditLogs.metadata,
        previousHash: auditLogs.previousHash,
        hash: auditLogs.hash,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(conditions)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
