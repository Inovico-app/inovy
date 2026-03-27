"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActiveMemberRole } from "@/hooks/use-active-member-role";
import { OrganizationSwitcher } from "@/components/organization-switcher";

import { cn } from "@/lib/utils";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Scale,
} from "lucide-react";
import { adminLinks, isNavActive, navLinks } from "@/lib/navigation";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { data } = useActiveMemberRole();
  const { isAdmin, isSuperAdmin } = data ?? {};
  const t = useTranslations();

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState !== null) {
      setCollapsed(savedState === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  if (!mounted) {
    return (
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <header className="flex h-14 items-center justify-between px-4 border-b">
          <Skeleton className="h-6 w-20" />
        </header>
        <nav className="flex-1 space-y-1 p-2">
          {[...Array(navLinks.length)].map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-10 w-full mb-2" />
          ))}
        </nav>
      </aside>
    );
  }

  const showAdminSection = isAdmin || isSuperAdmin;

  // Resolve translated labels from keys like "nav.dashboard" → t("nav.dashboard")
  const resolveLabel = (labelKey: string) => {
    const [namespace, key] = labelKey.split(".") as [string, string];
    return t(`${namespace}.${key}`);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <header className="flex h-14 items-center justify-between px-4 border-b">
        {!collapsed && (
          <Link href="/" className="font-semibold text-xl">
            {t("common.brandName")}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn("h-8 w-8", collapsed && "mx-auto")}
          aria-label={
            collapsed
              ? t("sidebar.expandSidebar")
              : t("sidebar.collapseSidebar")
          }
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </header>

      <OrganizationSwitcher collapsed={collapsed} />

      <nav className="flex-1 space-y-1 p-2">
        <div className="space-y-1">
          {navLinks.map(({ to, labelKey, icon: Icon }) => {
            const active = isNavActive(pathname, to);
            const label = resolveLabel(labelKey);
            const linkContent = (
              <Link
                key={to}
                href={to as Route}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                aria-label={collapsed ? label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger render={linkContent} />
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </div>

        {showAdminSection && (
          <>
            <div className="my-4 border-t" />
            {!collapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("sidebar.adminSection")}
              </div>
            )}
            <div className="space-y-1">
              {adminLinks.map(({ to, labelKey, icon: Icon }) => {
                const active = isNavActive(pathname, to);
                const label = resolveLabel(labelKey);
                const linkContent = (
                  <Link
                    key={to}
                    href={to as Route}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                    aria-label={collapsed ? label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={to}>
                      <TooltipTrigger render={linkContent} />
                      <TooltipContent side="right">
                        <p>{label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          </>
        )}
      </nav>

      <div className="border-t p-2 space-y-2">
        <Link href="/record" as={"/record" as Route}>
          <Button
            className={cn("w-full justify-start gap-2", collapsed && "px-2")}
            variant="default"
            size={collapsed ? "icon" : "default"}
            aria-label={collapsed ? t("nav.newRecording") : undefined}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("nav.newRecording")}</span>}
          </Button>
        </Link>

        {!collapsed ? (
          <nav
            aria-label={t("sidebar.legal")}
            className="flex items-center justify-center gap-3 px-1 pt-1"
          >
            <Link
              href="/privacy-policy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("sidebar.privacy")}
            </Link>
            <span className="text-muted-foreground/60 text-xs">&middot;</span>
            <Link
              href="/terms-of-service"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("sidebar.terms")}
            </Link>
            <span className="text-muted-foreground/60 text-xs">&middot;</span>
            <Link
              href="/status"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("sidebar.status")}
            </Link>
          </nav>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/privacy-policy"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                    aria-label={t("sidebar.privacyPolicy")}
                  />
                }
              >
                <Scale className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent side="right">
                {t("sidebar.privacy")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/terms-of-service"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                    aria-label={t("sidebar.termsOfService")}
                  />
                }
              >
                <FileText className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent side="right">{t("sidebar.terms")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/status"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                    aria-label={t("sidebar.systemStatus")}
                  />
                }
              >
                <Activity className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent side="right">
                {t("sidebar.status")}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </aside>
  );
}
