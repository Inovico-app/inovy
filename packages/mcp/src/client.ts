import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "pino";
import type {
  AggregatedTool,
  MCPClientConfig,
  MCPServerHealth,
  RetryState,
} from "./types";
import { generateCorrelationId } from "./utils";

export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private tools: Map<string, Tool[]> = new Map();
  private toolToServer: Map<string, string> = new Map();
  private configs: Map<string, MCPClientConfig> = new Map();
  private healthStatus: Map<string, MCPServerHealth> = new Map();
  private retryStates: Map<string, RetryState> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private logger: Logger;

  constructor(configs: MCPClientConfig[], logger: Logger) {
    this.logger = logger.child({ component: "MCPClientManager" });
    const correlationId = generateCorrelationId();
    this.logger.info({ correlationId }, "Initializing MCP Client Manager");

    configs.forEach((config) => {
      this.configs.set(config.name, config);
      this.healthStatus.set(config.name, {
        name: config.name,
        status: "disconnected",
        lastCheck: new Date(),
        retryCount: 0,
      });

      // Initialize retry state
      this.retryStates.set(config.name, {
        attempts: 0,
        maxAttempts: config.retryAttempts ?? 3,
        baseDelay: config.retryDelay ?? 2000,
      });

      this.logger.info(
        { correlationId, serverName: config.name, config },
        "Registered MCP server configuration"
      );
    });

    // Start health check loop
    this.healthCheckInterval = setInterval(() => this.checkHealth(), 30000);
    this.logger.info(
      { correlationId },
      "Health check interval started (30 seconds)"
    );
  }

  /**
   * Connect to all configured MCP servers
   */
  async connectAll() {
    const correlationId = generateCorrelationId();
    this.logger.info(
      { correlationId, serverCount: this.configs.size },
      "Connecting to all MCP servers"
    );

    const results = await Promise.allSettled(
      Array.from(this.configs.values()).map((config) =>
        this.connectServer(config, correlationId)
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    this.logger.info(
      { correlationId, succeeded, failed, total: results.length },
      "MCP server connection results"
    );
  }

  /**
   * Connect to a single MCP server with exponential backoff retry logic
   */
  private async connectServer(
    config: MCPClientConfig,
    parentCorrelationId?: string
  ) {
    const correlationId = parentCorrelationId || generateCorrelationId();
    const serverLogger = this.logger.child({
      correlationId,
      serverName: config.name,
    });

    serverLogger.info("Attempting to connect to MCP server");
    this.updateHealth(config.name, "connecting");

    try {
      const startTime = Date.now();

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          // Config values act as defaults; runtime env should be able to override them.
          ...(config.env ?? {}),
          ...Object.fromEntries(
            Object.entries(process.env).filter(([_, v]) => v !== undefined) as [
              string,
              string
            ][]
          ),
        },
      });

      const client = new Client(
        {
          name: "inocy-mcp-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);

      const latency = Date.now() - startTime;

      this.clients.set(config.name, client);
      this.transports.set(config.name, transport);

      // Reset retry state on successful connection
      const retryState = this.retryStates.get(config.name);
      if (retryState) {
        retryState.attempts = 0;
        if (retryState.timeoutId) {
          clearTimeout(retryState.timeoutId);
          retryState.timeoutId = undefined;
        }
      }

      // Update health with latency
      this.updateHealth(config.name, "connected", undefined, latency, 0);

      // List tools
      const toolsResponse = await client.listTools();
      this.tools.set(config.name, toolsResponse.tools);

      // Map tools to server
      toolsResponse.tools.forEach((tool) => {
        this.toolToServer.set(tool.name, config.name);
      });

      serverLogger.info(
        {
          toolCount: toolsResponse.tools.length,
          latency,
          tools: toolsResponse.tools.map((t) => t.name),
        },
        "Successfully connected to MCP server"
      );

      // Handle transport close
      transport.onclose = () => {
        serverLogger.warn("MCP server connection closed");
        this.handleDisconnect(config.name, correlationId);
      };

      transport.onerror = (error) => {
        serverLogger.error({ error }, "MCP server transport error");
        this.handleDisconnect(config.name, correlationId);
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      serverLogger.error(
        { error: errorMessage },
        "Failed to connect to MCP server"
      );

      this.updateHealth(config.name, "error", errorMessage);

      // Attempt retry with exponential backoff
      await this.scheduleRetry(config, correlationId);

      throw error;
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private async scheduleRetry(
    config: MCPClientConfig,
    correlationId: string
  ): Promise<void> {
    const retryState = this.retryStates.get(config.name);
    if (!retryState) return;

    retryState.attempts++;

    if (retryState.attempts >= retryState.maxAttempts) {
      this.logger.error(
        {
          correlationId,
          serverName: config.name,
          attempts: retryState.attempts,
          maxAttempts: retryState.maxAttempts,
        },
        "Max retry attempts reached, giving up"
      );
      this.updateHealth(
        config.name,
        "error",
        "Max retry attempts reached",
        undefined,
        retryState.attempts
      );
      return;
    }

    // Calculate exponential backoff: baseDelay * 2^(attempts - 1)
    const delay = retryState.baseDelay * Math.pow(2, retryState.attempts - 1);

    this.logger.info(
      {
        correlationId,
        serverName: config.name,
        attempt: retryState.attempts,
        maxAttempts: retryState.maxAttempts,
        delay,
      },
      "Scheduling retry with exponential backoff"
    );

    this.updateHealth(
      config.name,
      "disconnected",
      `Retrying in ${delay}ms`,
      undefined,
      retryState.attempts
    );

    retryState.timeoutId = setTimeout(() => {
      this.connectServer(config, correlationId).catch((error) => {
        this.logger.error(
          { correlationId, serverName: config.name, error },
          "Retry failed"
        );
      });
    }, delay);
  }

  /**
   * Handle server disconnection
   */
  private async handleDisconnect(serverName: string, correlationId: string) {
    const serverLogger = this.logger.child({ correlationId, serverName });
    serverLogger.warn("Handling MCP server disconnect");

    this.updateHealth(serverName, "disconnected");
    this.clients.delete(serverName);
    this.transports.delete(serverName);
    this.tools.delete(serverName);

    // Remove tool mappings for this server
    for (const [toolName, server] of this.toolToServer.entries()) {
      if (server === serverName) {
        this.toolToServer.delete(toolName);
        serverLogger.debug({ toolName }, "Removed tool mapping");
      }
    }

    // Attempt reconnect with retry logic
    const config = this.configs.get(serverName);
    if (config) {
      const retryState = this.retryStates.get(serverName);
      if (retryState) {
        // Reset retry attempts for reconnection
        retryState.attempts = 0;
      }
      await this.scheduleRetry(config, correlationId);
    }
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools(): Promise<AggregatedTool[]> {
    const correlationId = generateCorrelationId();
    this.logger.debug({ correlationId }, "Fetching all tools");

    const allTools: AggregatedTool[] = [];
    for (const [serverName, tools] of this.tools.entries()) {
      allTools.push(...tools.map((t) => ({ ...t, sourceServer: serverName })));
    }

    this.logger.info(
      { correlationId, toolCount: allTools.length },
      "Retrieved all tools"
    );

    return allTools;
  }

  /**
   * Invoke a tool on its source MCP server
   */
  async invokeTool(
    toolName: string,
    params: Record<string, unknown>,
    parentCorrelationId?: string
  ) {
    const correlationId = parentCorrelationId || generateCorrelationId();
    const toolLogger = this.logger.child({ correlationId, toolName });

    toolLogger.info({ params }, "Invoking tool");

    const serverName = this.toolToServer.get(toolName);
    if (!serverName) {
      toolLogger.error("Tool not found");
      throw new Error(`Tool ${toolName} not found`);
    }

    const client = this.clients.get(serverName);
    if (!client) {
      toolLogger.error({ serverName }, "Server not connected");
      throw new Error(`Server ${serverName} is not connected`);
    }

    try {
      const startTime = Date.now();
      const result = await client.callTool({
        name: toolName,
        arguments: params,
      });
      const duration = Date.now() - startTime;

      toolLogger.info(
        { serverName, duration, result },
        "Tool invocation successful"
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toolLogger.error(
        { serverName, error: errorMessage },
        "Tool invocation failed"
      );
      throw error;
    }
  }

  /**
   * Get health status of all MCP servers
   */
  getHealthStatus(): MCPServerHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Update health status for a server
   */
  private updateHealth(
    name: string,
    status: MCPServerHealth["status"],
    error?: string,
    latency?: number,
    retryCount?: number
  ) {
    const current = this.healthStatus.get(name) || {
      name,
      status: "disconnected",
      lastCheck: new Date(),
      retryCount: 0,
    };

    this.healthStatus.set(name, {
      ...current,
      status,
      lastCheck: new Date(),
      error,
      latency,
      retryCount: retryCount ?? current.retryCount,
    });
  }

  /**
   * Periodic health check for all connected servers
   */
  private async checkHealth() {
    const correlationId = generateCorrelationId();
    this.logger.debug(
      { correlationId, serverCount: this.clients.size },
      "Running health check"
    );

    for (const [name, client] of this.clients.entries()) {
      try {
        const startTime = Date.now();
        await client.listTools(); // Simple ping
        const latency = Date.now() - startTime;

        this.updateHealth(name, "connected", undefined, latency);
        this.logger.debug(
          { correlationId, serverName: name, latency },
          "Health check passed"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          { correlationId, serverName: name, error: errorMessage },
          "Health check failed"
        );
        this.handleDisconnect(name, correlationId);
      }
    }
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown() {
    const correlationId = generateCorrelationId();
    this.logger.info({ correlationId }, "Shutting down MCP Client Manager");

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear all retry timeouts
    for (const retryState of this.retryStates.values()) {
      if (retryState.timeoutId) {
        clearTimeout(retryState.timeoutId);
      }
    }

    // Close all transports
    for (const [name, transport] of this.transports.entries()) {
      try {
        await transport.close();
        this.logger.info(
          { correlationId, serverName: name },
          "Closed MCP server connection"
        );
      } catch (error) {
        this.logger.error(
          { correlationId, serverName: name, error },
          "Error closing MCP server connection"
        );
      }
    }

    this.clients.clear();
    this.transports.clear();
    this.tools.clear();
    this.toolToServer.clear();
    this.logger.info({ correlationId }, "MCP Client Manager shutdown complete");
  }
}

