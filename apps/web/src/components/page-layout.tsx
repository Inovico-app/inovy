import { Suspense, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex h-svh">
      <Suspense
        fallback={
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="h-14 bg-muted animate-pulse rounded" />
            <div className="flex-1 overflow-auto">
              <div className="h-full w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        }
      >
        <Sidebar />
      </Suspense>
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main
          id="main-content"
          className="flex-1 overflow-auto"
          tabIndex={-1}
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

