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
import { useMfaSetup } from "@/features/auth/hooks/use-mfa-setup";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";

/**
 * MFA Setup Component
 *
 * Allows users to enable TOTP-based multi-factor authentication.
 * Displays QR code for authenticator app enrollment and backup codes.
 */
export function MfaSetup() {
  const t = useTranslations("auth");
  const {
    totpURI,
    backupCodes,
    isEnabling,
    isVerifying,
    isDisabling,
    isEnabled,
    enableMfa,
    verifyTotp,
    disableMfa,
  } = useMfaSetup();

  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleEnable = useCallback(async () => {
    if (!password) return;
    const success = await enableMfa(password);
    if (success) {
      setPassword("");
    }
  }, [password, enableMfa]);

  const handleVerify = useCallback(async () => {
    if (!verificationCode) return;
    const success = await verifyTotp(verificationCode);
    if (success) {
      setVerificationCode("");
      setShowBackupCodes(true);
    }
  }, [verificationCode, verifyTotp]);

  const handleDisable = useCallback(async () => {
    if (!disablePassword) return;
    const success = await disableMfa(disablePassword);
    if (success) {
      setDisablePassword("");
      setShowBackupCodes(false);
    }
  }, [disablePassword, disableMfa]);

  // Step 1: Enable MFA by entering password
  if (!totpURI && !isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("mfaSetupTitle")}</CardTitle>
          <CardDescription>{t("mfaSetupDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-password">{t("mfaEnterPassword")}</Label>
            <Input
              id="mfa-password"
              type="password"
              placeholder={t("mfaPasswordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleEnable();
              }}
              autoComplete="current-password"
            />
          </div>
          <Button
            onClick={() => void handleEnable()}
            disabled={isEnabling || !password}
          >
            {isEnabling ? t("mfaSettingUp") : t("mfaEnableMfa")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Scan QR code and verify
  if (totpURI && !isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("mfaScanQrTitle")}</CardTitle>
          <CardDescription>{t("mfaScanQrDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center rounded-lg bg-white p-4">
            <QRCodeSVG value={totpURI} size={200} level="M" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totp-uri" className="text-xs text-muted-foreground">
              {t("mfaManualEntryUri")}
            </Label>
            <Input
              id="totp-uri"
              value={totpURI}
              readOnly
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mfa-verify-code">{t("mfaVerificationCode")}</Label>
            <Input
              id="mfa-verify-code"
              type="text"
              inputMode="numeric"
              placeholder={t("mfaEnterSixDigit")}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleVerify();
              }}
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>
          <Button
            onClick={() => void handleVerify()}
            disabled={isVerifying || verificationCode.length !== 6}
          >
            {isVerifying ? t("mfaVerifying") : t("mfaVerifyAndActivate")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 3: MFA is enabled - show backup codes or disable option
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("mfaSetupTitle")}</CardTitle>
        <CardDescription>{t("mfaEnabledDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showBackupCodes && backupCodes.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium">
                {t("mfaSaveBackupCodes")}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("mfaBackupCodesHint")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code) => (
                  <code
                    key={code}
                    className="rounded bg-background px-2 py-1 text-center text-sm font-mono"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBackupCodes(false)}
            >
              {t("mfaBackupCodesSaved")}
            </Button>
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-destructive">
            {t("mfaDisableMfa")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("mfaDisableWarning")}
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="mfa-disable-password">
                {t("mfaEnterPasswordToDisable")}
              </Label>
              <Input
                id="mfa-disable-password"
                type="password"
                placeholder={t("mfaPasswordPlaceholder")}
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleDisable();
                }}
                autoComplete="current-password"
              />
            </div>
            <Button
              variant="destructive"
              onClick={() => void handleDisable()}
              disabled={isDisabling || !disablePassword}
            >
              {isDisabling ? t("mfaDisabling") : t("mfaDisableMfa")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
