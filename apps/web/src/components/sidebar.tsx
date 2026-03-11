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

export function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { data } = useActiveMemberRole();
  const { isAdmin, isSuperAdmin } = data ?? {};

  // Prevent hydration mismatch and restore collapsed state from localStorage
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
          collapsed ? "w-16" : "w-64"
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

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <header className="flex h-14 items-center justify-between px-4 border-b">
        {!collapsed && (
          <Link href="/" className="font-semibold text-xl">
            Inovy
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn("h-8 w-8", collapsed && "mx-auto")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </header>

      {/* Organization Switcher */}
      <OrganizationSwitcher collapsed={collapsed} />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = isNavActive(pathname, to);
            const linkContent = (
              <Link
                key={to}
                href={to as Route}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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

        {/* Admin Section */}
        {showAdminSection && (
          <>
            <div className="my-4 border-t" />
            {!collapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </div>
            )}
            <div className="space-y-1">
              {adminLinks.map(({ to, label, icon: Icon }) => {
                const active = isNavActive(pathname, to);
                const linkContent = (
                  <Link
                    key={to}
                    href={to as Route}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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

      {/* Footer */}
      <div className="border-t p-2 space-y-2">
        <Link href="/record" as={"/record" as Route}>
          <Button
            className={cn("w-full justify-start gap-2", collapsed && "px-2")}
            variant="default"
            size={collapsed ? "icon" : "default"}
            aria-label={collapsed ? "New Recording" : undefined}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>New Recording</span>}
          </Button>
        </Link>

        {!collapsed ? (
          <nav
            aria-label="Legal"
            className="flex items-center justify-center gap-3 px-1 pt-1"
          >
            <Link
              href="/privacy-policy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <span className="text-muted-foreground/60 text-xs">
              &middot;
            </span>
            <Link
              href="/terms-of-service"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Voorwaarden
            </Link>
          </nav>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger render={<Link href="/privacy-policy" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-muted-foreground" aria-label="Privacybeleid" />}>
                <Scale className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent side="right">Privacy</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Link href="/terms-of-service" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-muted-foreground" aria-label="Algemene Voorwaarden" />}>
                <FileText className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent side="right">Voorwaarden</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </aside>
  );
}

