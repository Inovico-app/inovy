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
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  disconnectGoogleAccount,
  getGoogleConnectionStatus,
} from "../actions/google-connection";

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

  // Load connection status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setStatus((prev) => ({ ...prev, loading: true }));

    const result = await getGoogleConnectionStatus();

    if (result && result.data) {
      setStatus({
        connected: result.data.connected,
        email: result.data.email,
        scopes: result.data.scopes,
        loading: false,
      });
    } else {
      setStatus((prev) => ({ ...prev, loading: false }));
      toast.error(result.serverError || "Failed to load connection status");
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);

    const result = await disconnectGoogleAccount();

    if (result.data) {
      toast.success("Google account disconnected successfully");
      setStatus({
        connected: false,
        loading: false,
      });
    } else {
      toast.error(result.serverError || "Failed to disconnect account");
    }

    setDisconnecting(false);
  }

  function handleConnect() {
    // Redirect to OAuth authorization endpoint
    window.location.href = "/api/integrations/google/authorize";
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
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Account:</span>{" "}
              <span className="text-muted-foreground">{status.email}</span>
            </div>
            {status.scopes && status.scopes.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Permissions:</span>
                <ul className="mt-1 ml-4 list-disc text-muted-foreground">
                  {status.scopes.includes(
                    "https://www.googleapis.com/auth/gmail.compose"
                  ) && <li>Create Gmail drafts</li>}
                  {status.scopes.includes(
                    "https://www.googleapis.com/auth/calendar.events"
                  ) && <li>Create calendar events</li>}
                  {status.scopes.includes(
                    "https://www.googleapis.com/auth/drive.readonly"
                  ) && <li>Read Drive files and folders</li>}
                </ul>
              </div>
            )}
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
                    This will revoke Inovy's access to your Google account.
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
            <Button onClick={handleConnect}>Connect Google Account</Button>
          )}
        </div>

        {/* Features List */}
        <div className="mt-4 rounded-lg border bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Available Features:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Automatically create calendar events from extracted tasks</li>
            <li>• Generate Gmail drafts from meeting summaries</li>
            <li>• Customize email templates and event details</li>
            <li>• Configure automation preferences</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

