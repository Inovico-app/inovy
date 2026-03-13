"use client";

import dynamic from "next/dynamic";

export const SettingsSidebarDynamic = dynamic(
  () =>
    import("@/features/settings/components/settings-sidebar").then(
      (m) => m.SettingsSidebar
    ),
  { ssr: false }
);
