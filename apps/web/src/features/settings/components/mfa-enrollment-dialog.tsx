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
import { useEnrollMfa, useVerifyMfaEnrollment } from "../../auth/hooks/use-mfa";
import { CopyIcon, DownloadIcon, KeyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface MfaEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MfaEnrollmentDialog({
  open,
  onOpenChange,
}: MfaEnrollmentDialogProps) {
  const [step, setStep] = useState<"generate" | "verify" | "backup">("generate");
  const [verificationCode, setVerificationCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const { execute: enroll, isPending: isEnrolling } = useEnrollMfa();
  const { execute: verify, isPending: isVerifying } = useVerifyMfaEnrollment();

  useEffect(() => {
    if (!open) {
      setStep("generate");
      setVerificationCode("");
      setQrCodeUrl("");
      setManualKey("");
      setBackupCodes([]);
    }
  }, [open]);

  const handleEnroll = async () => {
    const result = await enroll({});

    if (result?.data) {
      setQrCodeUrl(result.data.qrCodeUrl);
      setManualKey(result.data.manualEntryKey);
      setStep("verify");
    }
  };

  const handleVerify = async () => {
    const result = await verify({ token: verificationCode });

    if (result?.data?.backupCodes) {
      setBackupCodes(result.data.backupCodes);
      setStep("backup");
    }
  };

  const handleDownloadBackupCodes = () => {
    const text = backupCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inovy-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Backup codes copied to clipboard");
  };

  const handleComplete = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "generate" && (
          <>
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Add an extra layer of security to your account by enabling MFA
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <KeyIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">What is MFA?</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Multi-factor authentication requires you to enter a code from
                      your authenticator app in addition to your password when
                      signing in.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>Access to your email for account recovery</li>
                  <li>Safe place to store backup codes</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleEnroll} disabled={isEnrolling}>
                {isEnrolling ? "Generating..." : "Get Started"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
              <DialogDescription>
                Use your authenticator app to scan this QR code
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="border rounded-lg p-4 bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="MFA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Manual Entry Key</Label>
                <div className="flex gap-2">
                  <Input value={manualKey} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(manualKey);
                      toast.success("Key copied to clipboard");
                    }}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you can&apos;t scan the QR code, enter this key manually in your
                  authenticator app
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to verify the
                  setup
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("generate")}>
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={isVerifying || verificationCode.length !== 6}
              >
                {isVerifying ? "Verifying..." : "Verify & Enable"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "backup" && (
          <>
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>
                Store these codes in a safe place. You can use them to access your
                account if you lose your authenticator device.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="font-mono text-sm bg-background px-3 py-2 rounded border"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyBackupCodes}
                >
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Copy Codes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadBackupCodes}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-900">
                  <strong>Important:</strong> Each backup code can only be used once.
                  After using a code, it will be invalidated. Store these codes
                  securely and keep them separate from your authenticator device.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleComplete} className="w-full">
                I&apos;ve Saved My Codes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
