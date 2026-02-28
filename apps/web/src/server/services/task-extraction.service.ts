import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { connectionPool } from "@/server/services/connection-pool.service";
import { GuardrailsService } from "@/server/services/guardrails.service";
import { PromptBuilder } from "@/server/services/prompt-builder.service";
import { err, ok } from "neverthrow";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { NotificationService } from "./notification.service";

interface ExtractedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  assigneeName?: string;
  dueDate?: string;
  confidenceScore: number;
  meetingTimestamp?: number;
}

interface TaskExtractionResult {
  tasks: ExtractedTask[];
  totalExtracted: number;
}

export class TaskExtractionService {
  /**
   * Dutch urgency keywords for priority detection (AI-004)
   */
  private static readonly PRIORITY_KEYWORDS = {
    urgent: [
      "dringend",
      "urgent",
      "direct",
      "meteen",
      "onmiddellijk",
      "vandaag nog",
      "zo snel mogelijk",
      "asap",
      "kritiek",
      "kritisch",
    ],
    high: [
      "belangrijk",
      "prioriteit",
      "deze week",
      "deadline",
      "spoedig",
      "snel",
      "haast",
      "hoogste prioriteit",
    ],
    medium: ["binnenkort", "volgende week", "regulier", "normaal", "standaard"],
    low: [
      "ooit",
      "misschien",
      "nice to have",
      "later",
      "wanneer mogelijk",
      "geen haast",
      "lage prioriteit",
    ],
  };

  /**
   * Extract action items from transcription using OpenAI GPT-5
   * Includes AI-004 priority assignment logic
   */
  static async extractTasks(
    recordingId: string,
    projectId: string,
    transcriptionText: string,
    organizationId: string,
    createdById: string,
    utterances?: Array<{ speaker: number; text: string; start: number }>
  ): Promise<ActionResult<TaskExtractionResult>> {
    try {
      logger.info("Starting task extraction", {
        component: "TaskExtractionService.extractTasks",
        recordingId,
        transcriptionLength: transcriptionText.length,
      });

      // Get knowledge context for prompt building
      const knowledgeResult = await KnowledgeBaseService.getApplicableKnowledge(
        projectId,
        organizationId
      );
      const knowledgeEntries = knowledgeResult.isOk()
        ? knowledgeResult.value
        : [];
      const knowledgeContext = knowledgeEntries
        .map((entry) => `${entry.term}: ${entry.definition}`)
        .join("\n");

      // Build prompt using PromptBuilder
      const promptResult = PromptBuilder.Tasks.buildPrompt({
        transcriptionText,
        utterances,
        priorityKeywords: this.PRIORITY_KEYWORDS,
        knowledgeContext: knowledgeContext || undefined,
      });

      // Guardrails: validate transcription input before LLM call
      const guardrailsInput = await GuardrailsService.validateInput({
        text: transcriptionText,
        orgId: existingRecording.organizationId,
        projectId: existingRecording.projectId,
        userId: existingRecording.createdById,
      });

      if (guardrailsInput.blocked) {
        logger.warn("Task extraction input blocked by guardrails", {
          component: "TaskExtractionService.extractTasks",
          recordingId,
        });
        return err(
          ActionErrors.forbidden(
            "Transcription content was blocked by the safety policy",
            undefined,
            "TaskExtractionService.extractTasks"
          )
        );
      }

      const completion = await connectionPool.executeWithRetry(
        async () =>
          connectionPool.getRawOpenAIClient().chat.completions.create({
            model: "gpt-5-nano",
            messages: [
              { role: "system", content: promptResult.systemPrompt },
              { role: "user", content: promptResult.userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        "openai"
      );

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        logger.error("No content in OpenAI response", {
          component: "TaskExtractionService.extractTasks",
        });

        // Create failure notification
        const recording =
          await RecordingsQueries.selectRecordingById(recordingId);
        if (recording) {
          await NotificationService.createNotification({
            recordingId,
            projectId: recording.projectId,
            userId: recording.createdById,
            organizationId: recording.organizationId,
            type: "tasks_failed",
            title: "Taakextractie mislukt",
            message: `De taakextractie uit "${recording.title}" is mislukt.`,
            metadata: {
              error: "No response from OpenAI",
            },
          });
        }

        return err(
          ActionErrors.internal(
            "No response from OpenAI",
            undefined,
            "TaskExtractionService.extractTasks"
          )
        );
      }

      // Parse JSON response
      let extractionResult: { tasks: ExtractedTask[] };
      try {
        extractionResult = JSON.parse(responseContent);
      } catch (parseError) {
        logger.error("Failed to parse OpenAI response", {
          component: "TaskExtractionService.extractTasks",
          error: parseError,
          responseContent,
        });
        return err(
          ActionErrors.internal(
            "Failed to parse task extraction response",
            parseError as Error,
            "TaskExtractionService.extractTasks"
          )
        );
      }

      if (!extractionResult.tasks || !Array.isArray(extractionResult.tasks)) {
        logger.error("Invalid task extraction format", {
          component: "TaskExtractionService.extractTasks",
          extractionResult,
        });
        return err(
          ActionErrors.internal(
            "Invalid task extraction format",
            undefined,
            "TaskExtractionService.extractTasks"
          )
        );
      }

      // Create tasks in database
      const createdTasks = [];
      for (const task of extractionResult.tasks) {
        try {
          const createdTask = await TasksQueries.createTask({
            recordingId,
            projectId,
            title: task.title,
            description: task.description ?? null,
            priority: task.priority,
            status: "pending",
            assigneeId: null,
            assigneeName: task.assigneeName ?? null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            confidenceScore: task.confidenceScore ?? null,
            meetingTimestamp: task.meetingTimestamp ?? null,
            organizationId,
            createdById,
          });

          createdTasks.push(createdTask);
        } catch (taskError) {
          logger.warn("Failed to create individual task", {
            component: "TaskExtractionService.extractTasks",
            task,
            error: taskError,
          });
        }
      }

      logger.info("Task extraction completed", {
        component: "TaskExtractionService.extractTasks",
        recordingId,
        tasksExtracted: createdTasks.length,
        totalAttempted: extractionResult.tasks.length,
      });

      // Create success notification
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (recording) {
        await NotificationService.createNotification({
          recordingId,
          projectId: recording.projectId,
          userId: recording.createdById,
          organizationId: recording.organizationId,
          type: "tasks_completed",
          title: "Taken geëxtraheerd",
          message: `${createdTasks.length} ${
            createdTasks.length === 1 ? "taak" : "taken"
          } geëxtraheerd uit "${recording.title}".`,
          metadata: {
            tasksCount: createdTasks.length,
          },
        });
      }

      return ok({
        tasks: extractionResult.tasks,
        totalExtracted: createdTasks.length,
      });
    } catch (error) {
      logger.error("Error in task extraction service", {
        component: "TaskExtractionService.extractTasks",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to extract tasks",
          error as Error,
          "TaskExtractionService.extractTasks"
        )
      );
    }
  }

  /**
   * Manually adjust task priority
   */
  static async updateTaskPriority(
    taskId: string,
    priority: "low" | "medium" | "high" | "urgent"
  ): Promise<ActionResult<void>> {
    try {
      await TasksQueries.updateTask(taskId, { priority });

      logger.info("Task priority updated", {
        component: "TaskExtractionService.updateTaskPriority",
        taskId,
        priority,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error updating task priority", {
        component: "TaskExtractionService.updateTaskPriority",
        taskId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to update task priority",
          error as Error,
          "TaskExtractionService.updateTaskPriority"
        )
      );
    }
  }
}

