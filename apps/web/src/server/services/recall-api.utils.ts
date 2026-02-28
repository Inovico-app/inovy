/**
 * Shared utilities for Recall.ai API integration
 */

/**
 * Get Recall.ai API key from environment variables
 * @returns The API key
 * @throws Error if RECALL_API_KEY is not set
 */
export function getRecallApiKey(): string {
  const apiKey = process.env.RECALL_API_KEY;
  if (!apiKey) {
    throw new Error("RECALL_API_KEY environment variable is not set");
  }
  return apiKey;
}

