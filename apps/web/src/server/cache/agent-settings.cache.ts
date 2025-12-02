import { CacheTags } from "@/lib/cache-utils";
import { AgentSettingsQueries } from "@/server/data-access/agent-settings.queries";
import type { AgentSettings } from "@/server/db/schema/agent-settings";
import { cacheTag } from "next/cache";

/**
 * Get cached agent settings
 */
export async function getCachedAgentSettings(): Promise<AgentSettings> {
  "use cache";
  cacheTag(CacheTags.agentSettings());

  return await AgentSettingsQueries.getAgentSettings();
}

