"use client";

import { logger } from "@/lib/logger";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function HeaderAuthButtons() {
  const { user, isAuthenticated, isLoading, error } = useKindeBrowserClient();
  const [hasLoggedError, setHasLoggedError] = useState(false);

  // Log auth errors on client side
  useEffect(() => {
    if (error && !hasLoggedError) {
      const errorObj = new Error(`Kinde auth error: ${String(error)}`);
      logger.auth.error("Kinde client authentication error", errorObj);
      setHasLoggedError(true);
    }
  }, [error, hasLoggedError]);

  // Log successful auth state changes
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      logger.auth.sessionCheck(true, {
        userId: user.id,
        component: "HeaderAuthButtons",
      });
    } else if (!isLoading && !isAuthenticated) {
      logger.auth.sessionCheck(false, {
        component: "HeaderAuthButtons",
      });
    }
  }, [isLoading, isAuthenticated, user]);

  const handleLoginClick = () => {
    logger.auth.loginAttempt({ component: "HeaderAuthButtons" });
  };

  const handleLogoutClick = () => {
    logger.auth.logoutAttempt({
      userId: user?.id,
      component: "HeaderAuthButtons",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error) {
    // Show fallback UI when auth service is down
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Auth unavailable</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <>
        <span className="text-sm text-muted-foreground">
          {user?.email || "Unknown user"}
        </span>
        <LogoutLink onClick={handleLogoutClick}>
          <Button variant="outline" size="sm">
            Logout
          </Button>
        </LogoutLink>
      </>
    );
  }

  return (
    <LoginLink onClick={handleLoginClick}>
      <Button size="sm">Login</Button>
    </LoginLink>
  );
}

