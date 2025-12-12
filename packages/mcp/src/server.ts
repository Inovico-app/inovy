import { createMcpHandler } from "mcp-handler";
import { searchKnowledgeBaseToolDefinition } from "./tools/rag";
import { whoamiToolDefinition } from "./tools/whoami";
import { registerTool } from "./utils/register-tool";

export const mcpServer = createMcpHandler(
  (server) => {
    registerTool(server, whoamiToolDefinition);
    registerTool(server, searchKnowledgeBaseToolDefinition);
  },
  {
    capabilities: {
      tools: {
        listChanged: true,
      },
    },
  },
  {
    disableSse: true,
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    basePath: "/api/mcp",
    maxDuration: 60,
  }
);

