"use client";

import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";

export function ProjectTabs() {
  const t = useTranslations("projects");
  const [status, setStatus] = useQueryState("status", {
    defaultValue: "active",
    shallow: false,
  });

  return (
    <Tabs
      value={status}
      onValueChange={(value) => setStatus(value as string)}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="active">{t("activeProjects")}</TabsTrigger>
        <TabsTrigger value="archived">{t("archivedProjects")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
