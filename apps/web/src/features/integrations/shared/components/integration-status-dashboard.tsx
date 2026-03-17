"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Calendar,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { AutoAction } from "@/server/db/schema/auto-actions";

interface IntegrationStatusDashboardProps {
  title: string;
  getStatus: (input?: { limit?: number }) => Promise<{
    data?: {
      actions: Array<
        AutoAction & { recordingTitle?: string; taskTitle?: string }
      >;
      stats: {
        total: number;
        completed: number;
        failed: number;
        pending: number;
        calendarEvents: number;
        emailDrafts: number;
      };
    };
    serverError?: string;
  }>;
  retryAction: (input: { actionId: string }) => Promise<{
    data?: { success: boolean };
    serverError?: string;
  }>;
}

export function IntegrationStatusDashboard({
  title,
  getStatus,
  retryAction,
}: IntegrationStatusDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [actions, setActions] = useState<
    Array<
      AutoAction & {
        recordingTitle?: string;
        taskTitle?: string;
      }
    >
  >([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    calendarEvents: 0,
    emailDrafts: 0,
  });

  async function loadStatus() {
    setLoading(true);

    const result = await getStatus({ limit: 20 });

    if (result?.data) {
      setActions(result.data.actions);
      setStats(result.data.stats);
    } else {
      toast.error(
        result?.serverError ?? `Failed to load ${title.toLowerCase()}`,
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRetry(actionId: string) {
    setRetrying(actionId);

    const result = await retryAction({ actionId });

    if (result?.data) {
      toast.success("Action queued for retry");
      await loadStatus();
    } else {
      toast.error(result?.serverError ?? "Failed to retry action");
    }

    setRetrying(null);
  }

  function getStatusBadge(status: AutoAction["status"]) {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "pending":
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {status === "processing" ? "Processing" : "Pending"}
          </Badge>
        );
      default:
        return null;
    }
  }

  function getTypeIcon(type: AutoAction["type"]) {
    return type === "calendar_event" ? (
      <Calendar className="h-4 w-4" />
    ) : (
      <Mail className="h-4 w-4" />
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            View recent automatic actions and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              View recent automatic actions and their status
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Actions</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold text-red-600">
              {stats.failed}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{stats.calendarEvents}</div>
            <div className="text-sm text-muted-foreground">Calendar Events</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{stats.emailDrafts}</div>
            <div className="text-sm text-muted-foreground">Email Drafts</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Recent Actions */}
        <div className="space-y-2">
          <h4 className="font-medium">Recent Actions</h4>
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No actions yet. Actions will appear here when automatic calendar
              events or email drafts are created.
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getTypeIcon(action.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {action.type === "calendar_event" && action.taskTitle
                          ? action.taskTitle
                          : action.recordingTitle || "Untitled"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(action.createdAt).toLocaleString()}
                        {action.errorMessage && (
                          <span className="block text-xs text-red-600 mt-1">
                            Error: {action.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(action.status)}

                    {action.status === "completed" && action.externalUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        render={
                          <a
                            href={action.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                        nativeButton={false}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}

                    {action.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetry(action.id)}
                        disabled={retrying === action.id}
                      >
                        {retrying === action.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
