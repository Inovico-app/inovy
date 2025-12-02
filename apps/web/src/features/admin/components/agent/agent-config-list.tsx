import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCachedAgentConfig,
  getCachedAllOrganizations,
} from "@/server/cache/organization.cache";
import { AgentConfigListClient } from "./agent-config-list-client";

export interface AgentConfigOrgDto {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  memberCount: number;
  agentEnabled: boolean;
}

export async function AgentConfigList() {
  const organizations = await getCachedAllOrganizations();

  // Get agent config for each organization
  const orgsWithConfig: AgentConfigOrgDto[] = await Promise.all(
    organizations.map(async (org) => {
      const agentEnabled = await getCachedAgentConfig(org.id);
      return {
        ...org,
        agentEnabled,
      };
    })
  );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Agent Configuration</CardTitle>
          <CardDescription>
            {orgsWithConfig.length === 0
              ? "No organizations yet"
              : `Manage agent access for ${orgsWithConfig.length} organization${orgsWithConfig.length === 1 ? "" : "s"}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <AgentConfigListClient organizations={orgsWithConfig} />
      </CardContent>
    </Card>
  );
}

