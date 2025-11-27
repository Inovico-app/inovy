"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserDeletionRequest } from "@/server/db/schema/user-deletion-requests";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useDataDeletion } from "../hooks/use-data-deletion";

interface DataDeletionProps {
  initialDeletionRequest?: UserDeletionRequest | null;
}

export function DataDeletion({
  initialDeletionRequest = null,
}: DataDeletionProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  const {
    deletionRequest,
    isRequesting,
    isCancelling,
    requestDeletion,
    cancelDeletion,
  } = useDataDeletion(initialDeletionRequest);

  const handleRequestDeletion = () => {
    requestDeletion(confirmationText, confirmCheckbox);
    // Reset form on success (handled in hook)
    setConfirmationText("");
    setConfirmCheckbox(false);
  };

  const handleCancelDeletion = () => {
    if (!deletionRequest) return;
    cancelDeletion(deletionRequest.id);
  };

  function getStatusBadge(status: UserDeletionRequest["status"]) {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getDaysUntilPermanentDeletion(): number | null {
    if (
      !deletionRequest?.scheduledDeletionAt ||
      deletionRequest.status !== "completed"
    ) {
      return null;
    }

    const scheduledDate = new Date(deletionRequest.scheduledDeletionAt);
    const now = new Date();
    const diffTime = scheduledDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  const daysRemaining = getDaysUntilPermanentDeletion();
  const canCancel =
    deletionRequest &&
    deletionRequest.status !== "completed" &&
    deletionRequest.status !== "cancelled";

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          Right to be Forgotten
        </CardTitle>
        <CardDescription>
          Request deletion of all your personal data in compliance with GDPR.
          This action cannot be undone after the 30-day recovery period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: This action is irreversible</AlertTitle>
          <AlertDescription>
            Requesting data deletion will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Delete all recordings you own</li>
              <li>Anonymize your participation in other recordings</li>
              <li>Delete all tasks, summaries, and chat conversations</li>
              <li>Anonymize audit logs</li>
              <li>Remove your account access</li>
            </ul>
            <p className="mt-2 font-semibold">
              You have 30 days to cancel this request after it's processed.
            </p>
          </AlertDescription>
        </Alert>

        {/* Status Display */}
        {deletionRequest ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(deletionRequest.status)}
                  {deletionRequest.status === "completed" &&
                    daysRemaining !== null &&
                    daysRemaining > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
                        remaining
                      </Badge>
                    )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Requested:{" "}
                      {format(
                        new Date(deletionRequest.requestedAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </div>
                  {deletionRequest.processedAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Processed:{" "}
                      {format(
                        new Date(deletionRequest.processedAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </div>
                  )}
                  {deletionRequest.scheduledDeletionAt &&
                    deletionRequest.status === "completed" && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Permanent deletion:{" "}
                        {format(
                          new Date(deletionRequest.scheduledDeletionAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </div>
                    )}
                </div>
              </div>
              {canCancel && (
                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDeletion}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel Deletion"
                    )}
                  </Button>
                </div>
              )}
            </div>

            {deletionRequest.status === "completed" &&
              daysRemaining !== null &&
              daysRemaining > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Recovery Period Active</AlertTitle>
                  <AlertDescription>
                    Your data has been anonymized but can still be recovered for{" "}
                    {daysRemaining} more day{daysRemaining !== 1 ? "s" : ""}.
                    After this period, the deletion will be permanent.
                  </AlertDescription>
                </Alert>
              )}

            {deletionRequest.status === "completed" &&
              daysRemaining !== null &&
              daysRemaining === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Permanent Deletion</AlertTitle>
                  <AlertDescription>
                    The recovery period has ended. Your data has been
                    permanently deleted and cannot be recovered.
                  </AlertDescription>
                </Alert>
              )}
          </div>
        ) : (
          /* Request Form */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmationText">
                Type "DELETE MY DATA" to confirm
              </Label>
              <Input
                id="confirmationText"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="DELETE MY DATA"
                className="font-mono"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="confirmCheckbox"
                checked={confirmCheckbox}
                onCheckedChange={(checked) =>
                  setConfirmCheckbox(checked === true)
                }
              />
              <Label
                htmlFor="confirmCheckbox"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand that this action will permanently delete all my
                personal data and cannot be undone after the 30-day recovery
                period.
              </Label>
            </div>

            <Button
              onClick={handleRequestDeletion}
              disabled={
                isRequesting ||
                confirmationText !== "DELETE MY DATA" ||
                !confirmCheckbox
              }
              variant="destructive"
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Deletion...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete My Data
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

