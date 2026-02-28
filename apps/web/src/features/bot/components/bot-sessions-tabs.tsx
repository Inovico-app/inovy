"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryState } from "nuqs";

interface BotSessionsTabsProps {
  activeCount?: number;
  completedCount?: number;
  failedCount?: number;
}

export function BotSessionsTabs({
  activeCount = 0,
  completedCount = 0,
  failedCount = 0,
}: BotSessionsTabsProps) {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: "active",
    shallow: false,
  });

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="active" className="flex items-center gap-2">
          Active
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          Completed
          {completedCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {completedCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="failed" className="flex items-center gap-2">
          Failed
          {failedCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {failedCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

