import { Skeleton } from "@/components/ui/skeleton";
import { getCachedAgentSettings } from "@/server/cache/agent-settings.cache";
import { Suspense } from "react";
import { AgentSettingsForm } from "./agent-settings-form";

export async function AgentSettings() {
  const settings = await getCachedAgentSettings();

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AgentSettingsForm initialSettings={settings} />
    </Suspense>
  );
}

