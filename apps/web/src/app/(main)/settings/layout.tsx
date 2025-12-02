import { SettingsSidebar } from "@/features/settings/components/settings-sidebar";
import { Suspense, type ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Suspense>
        <SettingsSidebar />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

