"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  useGetAuthPolicy,
  useUpdateAuthPolicy,
} from "../../auth/hooks/use-auth-policy";
import { AlertCircleIcon, InfoIcon, SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function AuthPolicyForm() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [requireMfa, setRequireMfa] = useState(false);
  const [mfaGracePeriodDays, setMfaGracePeriodDays] = useState(30);

  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [passwordRequireUppercase, setPasswordRequireUppercase] = useState(false);
  const [passwordRequireLowercase, setPasswordRequireLowercase] = useState(false);
  const [passwordRequireNumbers, setPasswordRequireNumbers] = useState(false);
  const [passwordRequireSpecialChars, setPasswordRequireSpecialChars] =
    useState(false);

  const [passwordHistoryCount, setPasswordHistoryCount] = useState(0);
  const [passwordExpirationDays, setPasswordExpirationDays] = useState<
    number | null
  >(null);

  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(10080);
  const [sessionInactivityTimeoutMinutes, setSessionInactivityTimeoutMinutes] =
    useState(1440);

  const [maxFailedLoginAttempts, setMaxFailedLoginAttempts] = useState(5);
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(30);
  const [allowPasswordReset, setAllowPasswordReset] = useState(true);

  const { execute: getPolicy, result: policyResult } = useGetAuthPolicy();
  const { execute: updatePolicy, isPending: isUpdating } = useUpdateAuthPolicy();

  useEffect(() => {
    const loadData = async () => {
      const session = await getBetterAuthSession();
      if (session.isOk() && session.value.organization) {
        const orgId = session.value.organization.id;
        setOrganizationId(orgId);
        await getPolicy({ organizationId: orgId });
      }
    };
    loadData();
  }, [getPolicy]);

  useEffect(() => {
    const policy = policyResult?.data?.policy;
    if (policy) {
      setRequireEmailVerification(policy.requireEmailVerification);
      setRequireMfa(policy.requireMfa);
      setMfaGracePeriodDays(policy.mfaGracePeriodDays ?? 30);

      setPasswordMinLength(policy.passwordMinLength);
      setPasswordRequireUppercase(policy.passwordRequireUppercase);
      setPasswordRequireLowercase(policy.passwordRequireLowercase);
      setPasswordRequireNumbers(policy.passwordRequireNumbers);
      setPasswordRequireSpecialChars(policy.passwordRequireSpecialChars);

      setPasswordHistoryCount(policy.passwordHistoryCount ?? 0);
      setPasswordExpirationDays(policy.passwordExpirationDays);

      setSessionTimeoutMinutes(policy.sessionTimeoutMinutes);
      setSessionInactivityTimeoutMinutes(policy.sessionInactivityTimeoutMinutes);

      setMaxFailedLoginAttempts(policy.maxFailedLoginAttempts ?? 5);
      setLockoutDurationMinutes(policy.lockoutDurationMinutes ?? 30);
      setAllowPasswordReset(policy.allowPasswordReset);
    }
  }, [policyResult]);

  const handleSave = async () => {
    if (!organizationId) return;

    await updatePolicy({
      organizationId,
      requireEmailVerification,
      requireMfa,
      mfaGracePeriodDays,
      passwordMinLength,
      passwordRequireUppercase,
      passwordRequireLowercase,
      passwordRequireNumbers,
      passwordRequireSpecialChars,
      passwordHistoryCount,
      passwordExpirationDays: passwordExpirationDays ?? undefined,
      sessionTimeoutMinutes,
      sessionInactivityTimeoutMinutes,
      maxFailedLoginAttempts,
      lockoutDurationMinutes,
      allowPasswordReset,
    });
  };

  if (!organizationId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900">SSD-5.2.01 Compliance</h4>
            <p className="text-sm text-blue-800 mt-1">
              These settings ensure your organization meets client-specified
              authentication requirements according to NEN 7510 and healthcare
              security standards.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Email Verification</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Users must verify their email address before accessing the
                application
              </p>
            </div>
            <Switch
              checked={requireEmailVerification}
              onCheckedChange={setRequireEmailVerification}
            />
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">
            Multi-Factor Authentication
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Label>Require MFA for All Users</Label>
                <p className="text-sm text-muted-foreground">
                  All organization members must enable two-factor authentication
                </p>
              </div>
              <Switch checked={requireMfa} onCheckedChange={setRequireMfa} />
            </div>

            {requireMfa && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="mfa-grace-period">Grace Period (Days)</Label>
                <Input
                  id="mfa-grace-period"
                  type="number"
                  min={0}
                  max={365}
                  value={mfaGracePeriodDays}
                  onChange={(e) =>
                    setMfaGracePeriodDays(parseInt(e.target.value) || 30)
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Number of days new members have to enable MFA after joining
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Password Requirements</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password-min-length">Minimum Length</Label>
              <Input
                id="password-min-length"
                type="number"
                min={8}
                max={128}
                value={passwordMinLength}
                onChange={(e) =>
                  setPasswordMinLength(parseInt(e.target.value) || 8)
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Minimum number of characters required in passwords (minimum 8)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Require Uppercase Letters</Label>
                <Switch
                  checked={passwordRequireUppercase}
                  onCheckedChange={setPasswordRequireUppercase}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Require Lowercase Letters</Label>
                <Switch
                  checked={passwordRequireLowercase}
                  onCheckedChange={setPasswordRequireLowercase}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Require Numbers</Label>
                <Switch
                  checked={passwordRequireNumbers}
                  onCheckedChange={setPasswordRequireNumbers}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Require Special Characters</Label>
                <Switch
                  checked={passwordRequireSpecialChars}
                  onCheckedChange={setPasswordRequireSpecialChars}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-history">Password History</Label>
              <Input
                id="password-history"
                type="number"
                min={0}
                max={24}
                value={passwordHistoryCount}
                onChange={(e) =>
                  setPasswordHistoryCount(parseInt(e.target.value) || 0)
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Prevent reuse of last N passwords (0 = disabled)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-expiration">
                Password Expiration (Days)
              </Label>
              <Input
                id="password-expiration"
                type="number"
                min={0}
                max={365}
                value={passwordExpirationDays ?? ""}
                onChange={(e) =>
                  setPasswordExpirationDays(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                placeholder="Never"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Force password change after N days (empty = never expires)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Session Management</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">
                Session Timeout (Minutes)
              </Label>
              <Input
                id="session-timeout"
                type="number"
                min={5}
                max={43200}
                value={sessionTimeoutMinutes}
                onChange={(e) =>
                  setSessionTimeoutMinutes(parseInt(e.target.value) || 10080)
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Maximum session duration (default: 7 days = 10,080 minutes)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inactivity-timeout">
                Inactivity Timeout (Minutes)
              </Label>
              <Input
                id="inactivity-timeout"
                type="number"
                min={5}
                max={43200}
                value={sessionInactivityTimeoutMinutes}
                onChange={(e) =>
                  setSessionInactivityTimeoutMinutes(
                    parseInt(e.target.value) || 1440
                  )
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Auto-logout after N minutes of inactivity (default: 1 day = 1,440
                minutes)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Account Protection</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-failed-attempts">
                Max Failed Login Attempts
              </Label>
              <Input
                id="max-failed-attempts"
                type="number"
                min={1}
                max={100}
                value={maxFailedLoginAttempts}
                onChange={(e) =>
                  setMaxFailedLoginAttempts(parseInt(e.target.value) || 5)
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Lock account after N failed login attempts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockout-duration">Lockout Duration (Minutes)</Label>
              <Input
                id="lockout-duration"
                type="number"
                min={1}
                max={1440}
                value={lockoutDurationMinutes}
                onChange={(e) =>
                  setLockoutDurationMinutes(parseInt(e.target.value) || 30)
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                How long to lock account after max failed attempts
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Label>Allow Password Reset</Label>
                <p className="text-sm text-muted-foreground">
                  Users can reset their password via email
                </p>
              </div>
              <Switch
                checked={allowPasswordReset}
                onCheckedChange={setAllowPasswordReset}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900">Important Note</h4>
              <p className="text-sm text-amber-800 mt-1">
                Changes to authentication policies will affect all current and future
                users in your organization. Existing sessions will remain active
                until they expire or users log out.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isUpdating}>
            <SaveIcon className="h-4 w-4 mr-2" />
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
