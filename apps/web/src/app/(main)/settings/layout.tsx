import { SettingsNav } from "@/features/settings/components/settings-nav";
import { Suspense, type ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <Suspense>
        <SettingsNav />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
