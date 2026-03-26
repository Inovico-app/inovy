"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useActiveMemberRole } from "@/hooks/use-active-member-role";
import { adminLinks, isNavActive, navLinks } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Menu, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data } = useActiveMemberRole();
  const { isAdmin, isSuperAdmin } = data ?? {};
  const showAdminSection = isAdmin || isSuperAdmin;
  const t = useTranslations();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("mobileSidebar.openMenu")}
          />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="h-14 flex flex-row items-center px-4 border-b">
          <SheetTitle className="font-semibold text-xl">
            {t("common.brandName")}
          </SheetTitle>
        </SheetHeader>

        <nav
          className="flex-1 space-y-1 p-3"
          aria-label={t("mobileSidebar.mainNav")}
        >
          {navLinks.map(({ to, labelKey, icon: Icon }) => {
            const active = isNavActive(pathname, to);
            return (
              <Link
                key={to}
                href={to as Route}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{t(labelKey)}</span>
              </Link>
            );
          })}

          {showAdminSection && (
            <>
              <div className="my-4 border-t" />
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("sidebar.adminSection")}
              </div>
              {adminLinks.map(({ to, labelKey, icon: Icon }) => {
                const active = isNavActive(pathname, to);
                return (
                  <Link
                    key={to}
                    href={to as Route}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{t(labelKey)}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="border-t p-3 mt-auto">
          <Link href="/record" onClick={() => setOpen(false)}>
            <Button className="w-full justify-start gap-2" variant="default">
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t("nav.newRecording")}</span>
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
