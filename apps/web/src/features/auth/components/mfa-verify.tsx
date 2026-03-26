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
import { useTranslations } from "next-intl";
import type { Route } from "next";
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
  const t = useTranslations("auth");
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
        toast.error(result.error.message ?? t("mfaInvalidCode"));
        setIsVerifying(false);
        return;
      }

      toast.success(t("mfaSignedIn"));
      router.push("/" as Route);
    } catch (error) {
      logger.error("MFA TOTP verify error", {
        error,
        component: "MfaVerify",
        action: "handleVerifyTotp",
      });
      toast.error(t("mfaUnexpectedError"));
      setIsVerifying(false);
    }
  }, [code, router, t]);

  const handleVerifyBackupCode = useCallback(async () => {
    if (!code) return;
    setIsVerifying(true);
    try {
      const result = await authClient.twoFactor.verifyBackupCode({
        code,
      });

      if (result.error) {
        toast.error(result.error.message ?? t("mfaInvalidBackupCode"));
        setIsVerifying(false);
        return;
      }

      toast.success(t("mfaSignedIn"));
      router.push("/" as Route);
    } catch (error) {
      logger.error("MFA backup code verify error", {
        error,
        component: "MfaVerify",
        action: "handleVerifyBackupCode",
      });
      toast.error(t("mfaUnexpectedError"));
      setIsVerifying(false);
    }
  }, [code, router, t]);

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
        <CardTitle>{t("mfaTitle")}</CardTitle>
        <CardDescription>
          {useBackupCode ? t("mfaBackupDescription") : t("mfaDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">
            {useBackupCode ? t("mfaBackupCodeLabel") : t("mfaCodeLabel")}
          </Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode={useBackupCode ? "text" : "numeric"}
            placeholder={
              useBackupCode
                ? t("mfaBackupCodePlaceholder")
                : t("mfaCodePlaceholder")
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
          {isVerifying ? t("mfaVerifying") : t("mfaVerify")}
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
            {useBackupCode ? t("mfaUseAuthenticator") : t("mfaUseBackupCode")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
