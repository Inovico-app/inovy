/**
 * Workflow configuration constants
 */
export const MAX_RETRIES = 3;
export const RETRY_DELAYS = [1000, 5000, 15000]; // ms: 1s, 5s, 15s

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  recordingId: string;
  transcriptionCompleted: boolean;
  summaryCompleted: boolean;
  tasksExtracted: number;
  status: "completed" | "failed";
  error?: string;
}

/**
 * Workflow context passed between steps
 */
export interface WorkflowContext {
  recordingId: string;
  fileUrl: string;
  projectId: string;
  organizationId: string;
  createdById: string;
  transcriptionText?: string;
  utterances?: Array<{ speaker: number; text: string; start: number }>;
}

