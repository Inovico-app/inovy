"use client";

import { useUserRole } from "@/hooks/use-user-role";
import { logger } from "@/lib/logger";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function HeaderAuthButtons() {
  const { user, isAuthenticated, isLoading, error } = useKindeBrowserClient();
  const { data: userRoleData } = useUserRole();
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

  const { isAdmin, isSuperAdmin, roles } = userRoleData ?? {};
  const firstRole = roles?.[0];

  if (isAuthenticated && user) {
    // Get user initials for avatar fallback
    const initials =
      user.given_name && user.family_name
        ? `${user.given_name[0]}${user.family_name[0]}`.toUpperCase()
        : user.email?.[0]?.toUpperCase() ?? "U";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user.picture ?? undefined}
                alt={user.email ?? "User"}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex justify-between gap-4 items-center">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium leading-none">
                  {user.given_name && user.family_name
                    ? `${user.given_name} ${user.family_name}`
                    : user.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <Badge className="capitalize">
                {isSuperAdmin ? "Superadmin" : isAdmin ? "Admin" : firstRole}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <LogoutLink
              onClick={handleLogoutClick}
              className="cursor-pointer w-full"
            >
              <span>Log out</span>
            </LogoutLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <LoginLink onClick={handleLoginClick}>
      <Button size="sm">Login</Button>
    </LoginLink>
  );
}

