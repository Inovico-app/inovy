"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useGetMfaStatus } from "../../auth/hooks/use-mfa";
import {
  CheckCircle2Icon,
  KeyIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MfaEnrollmentDialog } from "./mfa-enrollment-dialog";

export function MfaSettings() {
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const { execute: getMfaStatus, result: mfaStatusResult } = useGetMfaStatus();

  useEffect(() => {
    getMfaStatus({});
  }, [getMfaStatus]);

  const mfaStatus = mfaStatusResult?.data?.data;
  const isEnabled = mfaStatus?.enabled ?? false;
  const isRequired = mfaStatus?.required ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">MFA Status</h3>
            {isEnabled ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                <CheckCircle2Icon className="h-3 w-3" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                <XCircleIcon className="h-3 w-3" />
                Disabled
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isEnabled
              ? "Your account is protected with two-factor authentication"
              : "Add an extra layer of security by enabling MFA"}
          </p>
        </div>

        <div>
          {isEnabled ? (
            <Button
              variant="outline"
              onClick={() => setIsDisableDialogOpen(true)}
              disabled={isRequired}
            >
              Disable MFA
            </Button>
          ) : (
            <Button onClick={() => setIsEnrollDialogOpen(true)}>
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              Enable MFA
            </Button>
          )}
        </div>
      </div>

      {isRequired && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900">
                MFA Required by Organization
              </h4>
              <p className="text-sm text-amber-800 mt-1">
                Your organization requires all members to enable multi-factor
                authentication. You have {mfaStatus?.gracePeriodDays ?? 30} days from
                when you joined to complete enrollment.
              </p>
            </div>
          </div>
        </div>
      )}

      {isEnabled && (
        <>
          <Separator />
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Enrolled On</h4>
              <p className="text-sm text-muted-foreground">
                {mfaStatus?.enrolledAt
                  ? new Date(mfaStatus.enrolledAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Last Verification</h4>
              <p className="text-sm text-muted-foreground">
                {mfaStatus?.lastVerificationAt
                  ? new Date(mfaStatus.lastVerificationAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "Never"}
              </p>
            </div>
          </div>
        </>
      )}

      <MfaEnrollmentDialog
        open={isEnrollDialogOpen}
        onOpenChange={setIsEnrollDialogOpen}
      />

      <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable MFA? This will make your account less
              secure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Confirm Your Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDisableDialogOpen(false);
                setDisablePassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDisableDialogOpen(false);
                setDisablePassword("");
              }}
            >
              Disable MFA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
