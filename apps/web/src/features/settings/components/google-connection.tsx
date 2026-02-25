"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IncrementalPermissionDialog } from "@/features/integrations/google/components/incremental-permission-dialog";
import { PermissionExplanationDialog } from "@/features/integrations/google/components/permission-explanation-dialog";
import { type ScopeTier } from "@/features/integrations/google/lib/scope-constants";
import {
  hasRequiredScopes,
  tierToLabel,
} from "@/features/integrations/google/lib/scope-utils";
import {
  Calendar,
  CheckCircle2,
  HardDrive,
  Loader2,
  Mail,
  Plus,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  disconnectGoogleAccount,
  getGoogleConnectionStatus,
} from "../actions/google-connection";

const FEATURE_TIERS: { tier: ScopeTier; icon: typeof Calendar }[] = [
  { tier: "base", icon: Calendar },
  { tier: "calendarWrite", icon: Calendar },
  { tier: "gmail", icon: Mail },
  { tier: "drive", icon: HardDrive },
];

export function GoogleConnection() {
  const [status, setStatus] = useState<{
    connected: boolean;
    email?: string;
    scopes?: string[];
    loading: boolean;
  }>({
    connected: false,
    loading: true,
  });
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [incrementalTier, setIncrementalTier] = useState<ScopeTier | null>(
    null
  );

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_success") === "true") {
      loadStatus();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function loadStatus() {
    setStatus((prev) => ({ ...prev, loading: true }));

    try {
      const result = await getGoogleConnectionStatus();

      if (result?.data) {
        setStatus({
          connected: result.data.connected,
          email: result.data.email,
          scopes: result.data.scopes,
          loading: false,
        });
      } else {
        setStatus((prev) => ({ ...prev, loading: false }));
        toast.error(result?.serverError ?? "Failed to load connection status");
      }
    } catch {
      setStatus((prev) => ({ ...prev, loading: false }));
      toast.error("Failed to load connection status");
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);

    const result = await disconnectGoogleAccount();

    if (result.data) {
      toast.success("Google account disconnected successfully");
      setStatus({ connected: false, loading: false });
    } else {
      toast.error(result.serverError || "Failed to disconnect account");
    }

    setDisconnecting(false);
  }

  if (status.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Workspace Integration</CardTitle>
          <CardDescription>
            Connect your Google account to enable calendar and email features
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

  const userScopes = status.scopes ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Workspace Integration</CardTitle>
        <CardDescription>
          Connect your Google account to enable calendar and email features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {status.connected ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>

        {/* Connected Account Info */}
        {status.connected && status.email && (
          <div className="text-sm">
            <span className="font-medium">Account:</span>{" "}
            <span className="text-muted-foreground">{status.email}</span>
          </div>
        )}

        {/* Granular permissions display */}
        {status.connected && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Permissions:</span>
            <div className="grid gap-2">
              {FEATURE_TIERS.map(({ tier, icon: Icon }) => {
                const granted = hasRequiredScopes(userScopes, tier);
                return (
                  <div
                    key={tier}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">
                        {tierToLabel(tier)}
                      </span>
                    </div>
                    {granted ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 gap-1 text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        Granted
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 text-xs gap-1"
                        onClick={() => setIncrementalTier(tier)}
                      >
                        <Plus className="h-3 w-3" />
                        Grant
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status.connected ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={disconnecting}>
                  {disconnecting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Disconnect Google Account?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will revoke Inovy&apos;s access to your Google account.
                    Automatic calendar events and email drafts will be disabled.
                    Your existing recordings and tasks will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={() => setShowConnectDialog(true)}>
              Connect Google Account
            </Button>
          )}
        </div>

        {/* Features List */}
        <div className="mt-4 rounded-lg border bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Available Features:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              &bull; Automatically create calendar events from extracted tasks
            </li>
            <li>&bull; Generate Gmail drafts from meeting summaries</li>
            <li>&bull; Customize email templates and event details</li>
            <li>&bull; Configure automation preferences</li>
          </ul>
        </div>
      </CardContent>

      {/* Initial connection dialog (base scopes only) */}
      <PermissionExplanationDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        tiers={["base"]}
        redirectUrl="/settings/integrations?google_success=true"
      />

      {/* Incremental permission dialog */}
      {incrementalTier && (
        <IncrementalPermissionDialog
          open
          onOpenChange={(open: boolean) => {
            if (!open) setIncrementalTier(null);
          }}
          tier={incrementalTier}
          returnUrl="/settings/integrations?google_success=true"
        />
      )}
    </Card>
  );
}

