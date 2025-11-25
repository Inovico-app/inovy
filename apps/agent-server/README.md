# Agent Server

The Agent Server is a Hono-based HTTP server that manages MCP (Model Context Protocol) clients and provides a unified API for tool execution.

## Configuration

### Environment Variables

Create a `.env` file in the root of the agent-server directory with the following variables:

```bash
# Server Port
PORT=3001

# Node Environment
NODE_ENV=development

# CORS Configuration for Vercel deployments
# Vercel project name (must match your Vercel project)
VERCEL_PROJECT_NAME=inovy

# Custom production domain (if you have one configured in Vercel)
# Example: your-app.com (without https://)
VERCEL_PRODUCTION_DOMAIN=your-app.vercel.app

# Optional: Additional allowed origins (comma-separated)
# Use this if you need to allow additional domains beyond Vercel
# Example: ALLOWED_ORIGINS=https://custom-domain.com,https://another-domain.com
ALLOWED_ORIGINS=

# Logging
# Options: trace, debug, info, warn, error, fatal
LOG_LEVEL=info
```

### CORS Security

The server is configured to only accept requests from your Vercel deployments. It automatically allows:

- **Development**: `http://localhost:*` and `http://127.0.0.1:*`
- **Vercel Preview Deployments**: All preview URLs matching `https://{VERCEL_PROJECT_NAME}-*.vercel.app`
- **Vercel Production**: Your custom domain if `VERCEL_PRODUCTION_DOMAIN` is set
- **Additional Origins**: Any domains specified in `ALLOWED_ORIGINS`

This ensures that:
1. All your Vercel preview deployments can access the API
2. Your production deployment can access the API
3. Local development works seamlessly
4. Unauthorized origins are blocked and logged

**Important**: Make sure `VERCEL_PROJECT_NAME` matches your actual Vercel project name exactly.

## Development

```bash
# Install dependencies
pnpm install

# Start development server with watch mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm check-types

# Linting
pnpm lint
```

## API Endpoints

### GET /health

Returns the health status of all connected MCP servers.

**Response:**
```json
{
  "status": "ok",
  "mcpServers": [
    {
      "name": "server-name",
      "status": "connected",
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "latency": 50
    }
  ]
}
```

### GET /tools

Returns a list of all available tools from all MCP servers.

**Response:**
```json
[
  {
    "name": "tool-name",
    "description": "Tool description",
    "inputSchema": { ... },
    "sourceServer": "server-name"
  }
]
```

### POST /tools/execute

Executes a specific tool on its source MCP server.

**Request:**
```json
{
  "toolName": "tool-name",
  "args": { ... }
}
```

**Response:**
```json
{
  "content": [ ... ],
  "isError": false
}
```

## MCP Server Configuration

Configure MCP servers in `config/mcp-servers.json`. See the example configuration in that file for reference.

## Architecture

- **Hono Framework**: Fast, lightweight web framework
- **MCP Client Manager**: Manages connections to multiple MCP servers
- **Correlation IDs**: Every request is tracked with a correlation ID for debugging
- **Health Monitoring**: Continuous health checks on all MCP servers
- **Retry Logic**: Automatic retry with exponential backoff for failed connections
- **CORS Protection**: Restricts API access to allowed frontend origins

