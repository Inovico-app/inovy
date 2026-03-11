import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { Suspense } from "react";
import { HeaderAuthButtons } from "./header-auth-buttons";
import { MobileSidebar } from "./mobile-sidebar";
import { ModeToggle } from "./mode-toggle";

export function TopBar() {
  return (
    <header className="h-14 border-b bg-background">
      <div className="flex items-center justify-between h-full px-4 md:justify-end gap-3">
        <Suspense>
          <MobileSidebar />
        </Suspense>
        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <div
                className="h-9 w-9 bg-muted animate-pulse rounded"
                role="status"
                aria-label="Loading"
              />
            }
          >
            <NotificationBell />
          </Suspense>
          <Suspense
            fallback={
              <div
                className="h-9 w-16 bg-muted animate-pulse rounded"
                role="status"
                aria-label="Loading"
              />
            }
          >
            <HeaderAuthButtons />
          </Suspense>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
