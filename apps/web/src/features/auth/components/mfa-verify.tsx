"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * MFA Verification Component
 *
 * Displayed during sign-in when the user has MFA enabled.
 * Accepts a TOTP code or backup code to complete authentication.
 */
export function MfaVerify() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerifyTotp = useCallback(async () => {
    if (!code) return;
    setIsVerifying(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Invalid verification code");
        setIsVerifying(false);
        return;
      }

      toast.success("Signed in successfully");
      router.push("/");
    } catch (error) {
      logger.error("MFA TOTP verify error", {
        error,
        component: "MfaVerify",
        action: "handleVerifyTotp",
      });
      toast.error("An unexpected error occurred");
      setIsVerifying(false);
    }
  }, [code, router]);

  const handleVerifyBackupCode = useCallback(async () => {
    if (!code) return;
    setIsVerifying(true);
    try {
      const result = await authClient.twoFactor.verifyBackupCode({
        code,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Invalid backup code");
        setIsVerifying(false);
        return;
      }

      toast.success("Signed in successfully");
      router.push("/");
    } catch (error) {
      logger.error("MFA backup code verify error", {
        error,
        component: "MfaVerify",
        action: "handleVerifyBackupCode",
      });
      toast.error("An unexpected error occurred");
      setIsVerifying(false);
    }
  }, [code, router]);

  const handleSubmit = useCallback(() => {
    if (useBackupCode) {
      void handleVerifyBackupCode();
    } else {
      void handleVerifyTotp();
    }
  }, [useBackupCode, handleVerifyTotp, handleVerifyBackupCode]);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          {useBackupCode
            ? "Enter one of your backup codes to sign in."
            : "Enter the 6-digit code from your authenticator app to complete sign-in."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">
            {useBackupCode ? "Backup code" : "Authentication code"}
          </Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode={useBackupCode ? "text" : "numeric"}
            placeholder={
              useBackupCode ? "Enter backup code" : "Enter 6-digit code"
            }
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            maxLength={useBackupCode ? 20 : 6}
            autoComplete="one-time-code"
            autoFocus
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={
            isVerifying || !code || (!useBackupCode && code.length !== 6)
          }
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </Button>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode("");
            }}
          >
            {useBackupCode
              ? "Use authenticator app instead"
              : "Use a backup code instead"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
