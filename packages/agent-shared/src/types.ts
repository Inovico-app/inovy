import { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface MCPClientConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  retryAttempts?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in ms (default: 2000)
}

export interface MCPServerHealth {
  name: string;
  status: "connected" | "disconnected" | "connecting" | "error";
  lastCheck: Date;
  error?: string;
  latency?: number;
  retryCount?: number; // Current retry attempt count
}

export interface AggregatedTool extends Tool {
  sourceServer: string;
}

export interface RetryState {
  attempts: number;
  maxAttempts: number;
  baseDelay: number;
  timeoutId?: NodeJS.Timeout;
}

