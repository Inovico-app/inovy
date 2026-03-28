import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { parseAIJson } from "@/server/ai/parse-ai-json";
import { PromptBuilder } from "@/server/services/prompt-builder.service";
import { resilientModelProvider } from "@/server/services/resilient-model-provider.service";
import { generateText } from "ai";
import { err, ok } from "neverthrow";
import { createGuardedModel } from "../ai/middleware";
import { KnowledgeModule } from "./knowledge";
import { NotificationService } from "./notification.service";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import type { AIInsight } from "@/server/db/schema/ai-insights";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { ParticipantMatcher } from "./participant-matcher.service";

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
   * Extract action items from transcription using Claude Sonnet 4.6
   * Includes AI-004 priority assignment logic
   */
  static async extractTasks(
    recordingId: string,
    projectId: string,
    transcriptionText: string,
    organizationId: string,
    createdById: string,
    utterances?: Array<{ speaker: number; text: string; start: number }>,
    language = "nl",
  ): Promise<ActionResult<TaskExtractionResult>> {
    try {
      logger.info("Starting task extraction", {
        component: "TaskExtractionService.extractTasks",
        recordingId,
        transcriptionLength: transcriptionText.length,
      });

      // Get knowledge context for prompt building
      const knowledgeResult = await KnowledgeModule.getKnowledge({
        projectId,
        organizationId,
      });
      const knowledgeContext = knowledgeResult.isOk()
        ? knowledgeResult.value.glossary
        : "";

      // Build prompt using PromptBuilder
      const promptResult = PromptBuilder.Tasks.buildPrompt({
        transcriptionText,
        utterances,
        knowledgeContext: knowledgeContext || undefined,
        language,
      });

      // Call AI SDK with guardrails and resilient provider fallback
      const { result: completion } = await resilientModelProvider.execute(
        "claude-sonnet-4-6",
        async (model) => {
          const guardedModel = createGuardedModel(model, {
            requestType: "task-extraction",
            pii: { mode: "redact" },
            audit: { enabled: false },
          });

          return generateText({
            model: guardedModel,
            system: promptResult.systemPrompt,
            prompt: promptResult.userPrompt,
          });
        },
      );

      const responseContent = completion.text;

      if (!responseContent) {
        logger.error("No content in AI model response", {
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
              error: "No response from AI model",
            },
          });
        }

        return err(
          ActionErrors.internal(
            "No response from AI model",
            undefined,
            "TaskExtractionService.extractTasks",
          ),
        );
      }

      // Parse JSON response (strip markdown code fences if present)
      let extractionResult: { tasks: ExtractedTask[] };
      try {
        extractionResult = parseAIJson(responseContent);
      } catch (parseError) {
        logger.error("Failed to parse AI model response", {
          component: "TaskExtractionService.extractTasks",
          error: parseError,
          responseContent,
        });
        return err(
          ActionErrors.internal(
            "Failed to parse task extraction response",
            parseError as Error,
            "TaskExtractionService.extractTasks",
          ),
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
            "TaskExtractionService.extractTasks",
          ),
        );
      }

      // Fetch data needed for participant matching
      const [orgMembers, insightsList] = await Promise.all([
        OrganizationQueries.getMembersDirect(organizationId),
        AIInsightsQueries.getInsightsByRecordingId(recordingId),
      ]);

      // Get speaker mappings from the transcription insight
      const transcriptionInsight = insightsList.find(
        (i: AIInsight) => i.insightType === "transcription",
      );
      const speakerUserIds = transcriptionInsight?.speakerUserIds as
        | Record<string, string>
        | null
        | undefined;
      const speakerNames = transcriptionInsight?.speakerNames as
        | Record<string, string>
        | null
        | undefined;

      // Create tasks in database with auto-assignment
      const createdTasks = [];
      for (const task of extractionResult.tasks) {
        try {
          // Try to match assignee to org member
          let assigneeId: string | null = null;
          if (task.assigneeName) {
            // Find speaker index by reverse-looking up the name in speakerNames
            let speakerIndex: number | undefined;
            if (speakerNames) {
              const entry = Object.entries(speakerNames).find(
                ([, name]) =>
                  name.toLowerCase() === task.assigneeName!.toLowerCase(),
              );
              if (entry) {
                speakerIndex = parseInt(entry[0], 10);
              }
            }

            const match = ParticipantMatcher.match(
              task.assigneeName,
              orgMembers,
              speakerUserIds,
              speakerIndex,
            );

            if (match.userId) {
              assigneeId = match.userId;
              logger.info("Auto-assigned task", {
                component: "TaskExtractionService.extractTasks",
                assigneeName: task.assigneeName,
                assigneeId,
                matchType: match.matchType,
              });
            }
          }

          const createdTask = await TasksQueries.createTask({
            recordingId,
            projectId,
            title: task.title,
            description: task.description ?? null,
            priority: task.priority,
            status: "pending",
            assigneeId,
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

      // Create success notification for recording owner
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

        // Send task_assigned notifications to assignees
        for (const createdTask of createdTasks) {
          if (
            createdTask.assigneeId &&
            createdTask.assigneeId !== recording.createdById
          ) {
            await NotificationService.createNotification({
              recordingId,
              projectId: recording.projectId,
              userId: createdTask.assigneeId,
              organizationId: recording.organizationId,
              type: "task_assigned",
              title: "Nieuwe taak toegewezen",
              message: `Je bent toegewezen aan de taak: "${createdTask.title}"`,
              metadata: {
                taskId: createdTask.id,
                recordingId,
                projectId,
              },
            });
          }
        }
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
          "TaskExtractionService.extractTasks",
        ),
      );
    }
  }

  /**
   * Manually adjust task priority
   */
  static async updateTaskPriority(
    taskId: string,
    priority: "low" | "medium" | "high" | "urgent",
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
          "TaskExtractionService.updateTaskPriority",
        ),
      );
    }
  }
}
