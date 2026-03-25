/**
 * Workflow configuration constants
 */
export const MAX_RETRIES = 3;
export const RETRY_DELAYS = [1000, 5000, 15000]; // ms: 1s, 5s, 15s

/**
 * Workflow execution result
 */
export interface StorageWorkflowResult {
  recordingId: string;
  blobUrl: string | null;
  status: "completed" | "failed";
  error?: string;
}
