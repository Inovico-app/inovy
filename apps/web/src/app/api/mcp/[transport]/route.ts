import { mcpServer, verifyMcpToken } from "@inovy/mcp";
import { withMcpAuth } from "mcp-handler";

const authHandler = withMcpAuth(mcpServer, verifyMcpToken, {
  required: true,
  requiredScopes: ["read:inovy-rag"],
  resourceMetadataPath: "/api/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST };

