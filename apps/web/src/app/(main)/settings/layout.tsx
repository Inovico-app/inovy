import { ProtectedPage } from "@/components/protected-page";
import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SettingsSidebarDynamic } from "@/features/settings/components/settings-sidebar-dynamic";
import { Suspense, type ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  return (
    <ProtectedPage>
      <div className="flex h-full min-h-0">
        <Suspense>
          <SettingsSidebarDynamic />
        </Suspense>
        <div className="flex flex-col flex-1 min-w-0">
          <Suspense>
            <SettingsNav />
          </Suspense>
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <div className="max-w-3xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedPage>
  );
}
