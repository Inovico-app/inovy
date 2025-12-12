import type {
  McpServer,
  RegisteredTool,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AnySchema,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ZodRawShape, ZodType } from "zod";

export type { McpServer };

/**
 * Tool configuration for registering an MCP tool
 */
export interface ToolConfig<
  TInput extends undefined | ZodRawShapeCompat | AnySchema = undefined,
> {
  /**
   * A short title for the tool
   */
  title?: string;
  /**
   * A detailed description of what the tool does
   */
  description?: string;
  /**
   * Zod schema for validating tool input
   */
  inputSchema?: TInput;
}

/**
 * Complete tool definition combining name, config, and handler
 */
export interface ToolDefinition<
  TInput extends ZodRawShape | ZodType<object> = ZodRawShape,
> {
  /**
   * The name of the tool (must be unique)
   */
  name: string;
  /**
   * Tool configuration
   */
  config: ToolConfig<TInput>;
  /**
   * Handler function that matches the ToolCallback signature
   */
  handler: ToolCallback<TInput>;
}

/**
 * Registers a tool with the MCP server
 *
 * @param server - The MCP server instance
 * @param tool - The tool definition containing name, config, and handler
 *
 * @example
 * ```ts
 * registerTool(server, {
 *   name: "my_tool",
 *   config: {
 *     title: "My Tool",
 *     description: "Does something useful",
 *     inputSchema: {
 *       query: z.string().describe("The query string"),
 *     },
 *   },
 *   handler: async ({ query }, extra) => {
 *     return {
 *       content: [{ type: "text", text: `Result: ${query}` }],
 *     };
 *   },
 * });
 * ```
 */
export function registerTool<TInput extends ZodRawShape | ZodType<object>>(
  server: McpServer,
  tool: ToolDefinition<TInput>
): RegisteredTool {
  return server.registerTool(
    tool.name,
    {
      title: tool.config.title,
      description: tool.config.description,
      inputSchema: tool.config.inputSchema,
    },
    tool.handler
  );
}

