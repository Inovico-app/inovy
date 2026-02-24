"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PrivilegedAccessAlert } from "@/server/services/privileged-access.service";
import {
  AlertTriangleIcon,
  InfoIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PrivilegedAccessAlertsProps {
  alerts: PrivilegedAccessAlert[];
}

export function PrivilegedAccessAlerts({
  alerts,
}: PrivilegedAccessAlertsProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
          <CardDescription>
            Automated detection of anomalous privileged access patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <ShieldAlertIcon className="h-4 w-4" />
            <AlertTitle>All Clear</AlertTitle>
            <AlertDescription>
              No suspicious privileged access patterns detected.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircleIcon className="h-4 w-4" />;
      case "high":
        return <AlertTriangleIcon className="h-4 w-4" />;
      case "medium":
        return <AlertTriangleIcon className="h-4 w-4" />;
      case "low":
        return <InfoIcon className="h-4 w-4" />;
      default:
        return <InfoIcon className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (
    severity: string
  ): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const otherAlerts = alerts.filter(
    (a) => a.severity !== "critical" && a.severity !== "high"
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Security Alerts</CardTitle>
            <CardDescription>
              Automated detection of anomalous privileged access patterns
            </CardDescription>
          </div>
          <Badge variant="destructive" className="text-base px-3 py-1">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <XCircleIcon className="h-4 w-4 text-destructive" />
              Critical Alerts
            </h3>
            {criticalAlerts.map((alert) => (
              <Alert key={alert.id} variant="destructive">
                {getSeverityIcon(alert.severity)}
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.type.replace(/_/g, " ").toUpperCase()}</span>
                  <Badge variant={getSeverityVariant(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  <p className="mt-2">{alert.message}</p>
                  <div className="mt-3 space-y-1 text-xs">
                    <p>
                      <span className="font-medium">User:</span> {alert.userEmail}
                    </p>
                    <p>
                      <span className="font-medium">Detected:</span>{" "}
                      {formatDistanceToNow(alert.detectedAt, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {highAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
              High Priority Alerts
            </h3>
            {highAlerts.map((alert) => (
              <Alert key={alert.id}>
                {getSeverityIcon(alert.severity)}
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.type.replace(/_/g, " ").toUpperCase()}</span>
                  <Badge variant={getSeverityVariant(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  <p className="mt-2">{alert.message}</p>
                  <div className="mt-3 space-y-1 text-xs">
                    <p>
                      <span className="font-medium">User:</span> {alert.userEmail}
                    </p>
                    <p>
                      <span className="font-medium">Detected:</span>{" "}
                      {formatDistanceToNow(alert.detectedAt, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {otherAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <InfoIcon className="h-4 w-4 text-blue-500" />
              Other Alerts
            </h3>
            {otherAlerts.map((alert) => (
              <Alert key={alert.id}>
                {getSeverityIcon(alert.severity)}
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.type.replace(/_/g, " ").toUpperCase()}</span>
                  <Badge variant={getSeverityVariant(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  <p className="mt-2">{alert.message}</p>
                  <div className="mt-3 space-y-1 text-xs">
                    {alert.userEmail !== "system" && (
                      <p>
                        <span className="font-medium">User:</span>{" "}
                        {alert.userEmail}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Detected:</span>{" "}
                      {formatDistanceToNow(alert.detectedAt, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
