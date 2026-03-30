"use client";

import { useActiveMemberRole } from "@/hooks/use-active-member-role";
import { signOut, useSession } from "@/lib/auth-client";
import { usePermissions } from "@/lib/permissions/use-permissions";
import { logger } from "@/lib/logger";
import { Settings, Shield, User } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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
import { LocaleSwitcher } from "./locale-switcher";

export function HeaderAuthButtons() {
  const { data: session, isPending, error } = useSession();
  const user = session?.user;
  const isAuthenticated = !!user;
  const { data: roleData, isPending: isRolePending } =
    useActiveMemberRole(isAuthenticated);
  const router = useRouter();
  const t = useTranslations("headerAuth");
  const tCommon = useTranslations("common");

  const isLoading = isPending ?? isRolePending;
  const { hasRole } = usePermissions();

  const handleLoginClick = () => {
    logger.auth.loginAttempt({ component: "HeaderAuthButtons" });
    router.push("/sign-in" as Route);
  };

  const handleLogoutClick = async () => {
    logger.auth.logoutAttempt({
      userId: user?.id,
      component: "HeaderAuthButtons",
    });
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in" as Route); // redirect to login page
          router.refresh();
        },
      },
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
        <span className="text-sm text-muted-foreground">
          {t("unavailable")}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Get user initials for avatar fallback
    const userName = user.name ?? user.email ?? t("defaultUserName");
    const initials =
      userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) ??
      user.email?.[0]?.toUpperCase() ??
      "U";

    // Get roles from Better Auth API via useActiveMemberRole hook
    const userRoles = roleData?.roles ?? ["user"];
    const firstRole = userRoles[0] ?? "user";
    const isSuperAdmin = hasRole("superadmin");
    const isAdmin = hasRole("admin");

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="relative h-9 w-9 rounded-full" />
          }
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.email ?? t("defaultUserName")}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex justify-between gap-4 items-center">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <Badge className="capitalize">
                {isSuperAdmin
                  ? t("roleSuperadmin")
                  : isAdmin
                    ? t("roleAdmin")
                    : firstRole}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <>
              <DropdownMenuItem
                render={<Link href="/admin" className="cursor-pointer" />}
              >
                <Shield className="mr-2 h-4 w-4" />
                <span>{t("adminPanel")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            render={
              <Link href="/settings/profile" className="cursor-pointer" />
            }
          >
            <User className="mr-2 h-4 w-4" />
            <span>{t("profile")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href="/settings" className="cursor-pointer" />}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>{t("settings")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-1 py-1">
            <LocaleSwitcher />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogoutClick}
            className="cursor-pointer"
          >
            <span>{t("logOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button size="sm" onClick={handleLoginClick}>
      {t("login")}
    </Button>
  );
}
