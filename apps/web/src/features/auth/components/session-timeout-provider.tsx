"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSessionTimeout } from "@/features/auth/hooks/use-session-timeout";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";

interface SessionTimeoutProviderProps {
  children: ReactNode;
}

/**
 * Session Timeout Provider
 *
 * Wraps the application layout to enforce a 30-minute inactivity timeout.
 * Shows a warning dialog at 25 minutes with an option to extend the session.
 * Signs out and redirects to sign-in page on timeout.
 */
export function SessionTimeoutProvider({
  children,
}: SessionTimeoutProviderProps) {
  const router = useRouter();

  const handleTimeout = useCallback(async () => {
    try {
      await authClient.signOut();
      router.push("/sign-in?reason=session-expired");
    } catch (error) {
      logger.error("Failed to sign out on session timeout", {
        error,
        component: "SessionTimeoutProvider",
        action: "handleTimeout",
      });
      // Force redirect even if sign-out fails
      router.push("/sign-in?reason=session-expired");
    }
  }, [router]);

  const handleWarning = useCallback(() => {
    logger.debug("Session inactivity warning triggered", {
      component: "SessionTimeoutProvider",
    });
  }, []);

  const handleExtend = useCallback(() => {
    logger.debug("Session extended by user", {
      component: "SessionTimeoutProvider",
    });
  }, []);

  const { isWarningVisible, remainingSeconds, extendSession } =
    useSessionTimeout({
      onTimeout: () => void handleTimeout(),
      onWarning: handleWarning,
      onExtend: handleExtend,
    });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {children}
      <AlertDialog open={isWarningVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
            <AlertDialogDescription>
              Your session will expire in{" "}
              <span className="font-semibold tabular-nums">
                {formatTime(remainingSeconds)}
              </span>{" "}
              due to inactivity. Click below to extend your session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={extendSession}>
              Extend Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
