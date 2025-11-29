import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { Suspense } from "react";
import { HeaderAuthButtons } from "./header-auth-buttons";
import { ModeToggle } from "./mode-toggle";

export function TopBar() {
  return (
    <div className="h-14 border-b bg-background">
      <div className="flex items-center justify-end h-full px-4 gap-3">
        <Suspense
          fallback={<div className="h-9 w-9 bg-muted animate-pulse rounded" />}
        >
          <NotificationBell />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-9 w-16 bg-muted animate-pulse rounded" />
          }
        >
          <HeaderAuthButtons />
        </Suspense>
        <ModeToggle />
      </div>
    </div>
  );
}

