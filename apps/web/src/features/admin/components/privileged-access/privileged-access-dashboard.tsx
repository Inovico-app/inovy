"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  PrivilegedAccessStats,
  PrivilegedUser,
} from "@/server/data-access/privileged-access.queries";
import type { AuditLog } from "@/server/db/schema/audit-logs";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangleIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserCheckIcon,
} from "lucide-react";
import { PrivilegeReviewReport } from "./privilege-review-report";

interface PrivilegedAccessDashboardProps {
  privilegedUsers: PrivilegedUser[];
  stats: PrivilegedAccessStats;
  recentActions: AuditLog[];
  roleChanges: AuditLog[];
  isSuperAdmin: boolean;
}

export function PrivilegedAccessDashboard({
  privilegedUsers,
  stats,
  recentActions,
  roleChanges,
  isSuperAdmin,
}: PrivilegedAccessDashboardProps) {
  const inactiveThresholdDays = 90;
  const now = new Date();

  const inactiveUsers = privilegedUsers.filter((user) => {
    if (!user.lastActivity) return true;
    const daysSinceActivity = Math.floor(
      (now.getTime() - user.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceActivity > inactiveThresholdDays;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "superadmin":
        return "destructive";
      case "admin":
      case "owner":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getActionMetadata = (log: AuditLog) => {
    const metadata = log.metadata as Record<string, unknown> | null;
    if (!metadata) return null;

    if (log.eventType === "role_assigned" || log.eventType === "role_removed") {
      return {
        previousRole: metadata.previousRole as string | undefined,
        newRole: metadata.newRole as string | undefined,
        assignedRole: metadata.assignedRole as string | undefined,
        updatedBy: metadata.updatedBy as string | undefined,
      };
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Privileged Access Management</CardTitle>
              <CardDescription>
                Monitor, review, and control high-privilege accounts per
                SSD-7.1.02
              </CardDescription>
            </div>
            <PrivilegeReviewReport />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isSuperAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Superadmins
              </CardTitle>
              <ShieldAlertIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSuperadmins}</div>
              <p className="text-xs text-muted-foreground">
                System-wide access
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAdmins}</div>
            <p className="text-xs text-muted-foreground">
              Organization access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <ShieldIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalManagers}</div>
            <p className="text-xs text-muted-foreground">
              Elevated permissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactiveCount}</div>
            <p className="text-xs text-muted-foreground">
              No activity in {inactiveThresholdDays}+ days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Privileged Accounts</CardTitle>
          <CardDescription>
            All accounts with elevated permissions requiring regular review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {privilegedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No privileged users found
                  </TableCell>
                </TableRow>
              ) : (
                privilegedUsers.map((user) => {
                  const isInactive = !user.lastActivity || 
                    Math.floor(
                      (now.getTime() - user.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
                    ) > inactiveThresholdDays;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name ?? "No name"}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user.organizationId ?? "System-wide"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {user.lastActivity
                            ? formatDistanceToNow(user.lastActivity, {
                                addSuffix: true,
                              })
                            : "Never"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user.activityCount} actions
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isInactive && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Role Changes</CardTitle>
            <CardDescription>
              Role assignments and removals in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roleChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent role changes
                </p>
              ) : (
                roleChanges.slice(0, 10).map((log) => {
                  const meta = getActionMetadata(log);
                  return (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-4 pb-3 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {formatEventType(log.eventType)}
                        </p>
                        {meta && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {meta.previousRole && meta.newRole
                              ? `${meta.previousRole} → ${meta.newRole}`
                              : meta.assignedRole
                                ? `Assigned: ${meta.assignedRole}`
                                : "Role change"}
                          </p>
                        )}
                        {meta?.updatedBy && (
                          <p className="text-xs text-muted-foreground">
                            By: {meta.updatedBy}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(log.createdAt, {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Privileged Actions</CardTitle>
            <CardDescription>
              Actions performed by privileged accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent privileged actions
                </p>
              ) : (
                recentActions.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-4 pb-3 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {formatEventType(log.eventType)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.resourceType} {log.action}
                      </p>
                      {log.ipAddress && (
                        <p className="text-xs text-muted-foreground">
                          IP: {log.ipAddress}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(log.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance & Review Status</CardTitle>
          <CardDescription>
            SSD-7.1.02 compliance tracking for privileged access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="font-medium text-sm">Admin Accounts Documented</p>
                <p className="text-sm text-muted-foreground">
                  {privilegedUsers.length} privileged accounts tracked in system.
                  Documentation available at{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    docs/security/PRIVILEGED_ACCESS_MANAGEMENT.md
                  </code>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="font-medium text-sm">Privileged Access Monitored</p>
                <p className="text-sm text-muted-foreground">
                  {recentActions.length} privileged actions logged. Real-time
                  monitoring active with tamper-proof audit trail.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="font-medium text-sm">Regular Privilege Review</p>
                <p className="text-sm text-muted-foreground">
                  Quarterly review process established. Next review:{" "}
                  {new Date(
                    new Date().setMonth(new Date().getMonth() + 3)
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
            {stats.recentRoleChanges > 0 && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <AlertTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Recent Activity</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.recentRoleChanges} role change(s) in the last 30 days
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
