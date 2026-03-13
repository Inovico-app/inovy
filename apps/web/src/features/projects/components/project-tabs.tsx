"use client";

import { useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";

export function ProjectTabs() {
  const [status, setStatus] = useQueryState("status", {
    defaultValue: "active",
    shallow: false,
  });

  return (
    <Tabs value={status} onValueChange={(value) => setStatus(value as string)} className="w-full">
      <TabsList>
        <TabsTrigger value="active">Active Projects</TabsTrigger>
        <TabsTrigger value="archived">Archived Projects</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

