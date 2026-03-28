import { Suspense, type ReactNode } from "react";
import { DeletionWarningBanner } from "./deletion-warning-banner";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { OrganizationQueries } from "@/server/data-access/organization.queries";

interface PageLayoutProps {
  children: ReactNode;
}

async function DeletionBannerLoader() {
  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr()) return null;

  const { organization } = sessionResult.value;

  if (!organization?.id) return null;

  const orgRecord = await OrganizationQueries.findByIdDirect(organization.id);

  if (!orgRecord?.scheduledDeletionAt) return null;

  return (
    <DeletionWarningBanner
      organizationId={organization.id}
      scheduledDeletionAt={orgRecord.scheduledDeletionAt.toISOString()}
    />
  );
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
          <Suspense fallback={null}>
            <DeletionBannerLoader />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
