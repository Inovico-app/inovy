"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";

interface OrganizationTabsProps {
  generalContent: ReactNode;
  membersContent: ReactNode;
  aiContent: ReactNode;
}

export function OrganizationTabs({
  generalContent,
  membersContent,
  aiContent,
}: OrganizationTabsProps) {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: "general",
    shallow: false,
  });

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as string)}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="members">Members & Teams</TabsTrigger>
        <TabsTrigger value="ai">AI & Knowledge Base</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-6">
        {generalContent}
      </TabsContent>
      <TabsContent value="members" className="mt-6">
        {membersContent}
      </TabsContent>
      <TabsContent value="ai" className="mt-6">
        {aiContent}
      </TabsContent>
    </Tabs>
  );
}
