import OpenAI from "openai";
import { err, ok, type Result } from "neverthrow";
import { logger } from "@/lib/logger";
import { TasksQueries } from "@/server/data-access/tasks.queries";

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
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
  });

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
    medium: [
      "binnenkort",
      "volgende week",
      "regulier",
      "normaal",
      "standaard",
    ],
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
   * Extract action items from transcription using OpenAI GPT-4
   * Includes AI-004 priority assignment logic
   */
  static async extractTasks(
    recordingId: string,
    projectId: string,
    transcriptionText: string,
    organizationId: string,
    createdById: string,
    utterances?: Array<{ speaker: number; text: string; start: number }>
  ): Promise<Result<TaskExtractionResult, Error>> {
    try {
      logger.info("Starting task extraction", {
        component: "TaskExtractionService.extractTasks",
        recordingId,
        transcriptionLength: transcriptionText.length,
      });

      // Prepare speaker context if available
      let speakerContext = "";
      if (utterances && utterances.length > 0) {
        speakerContext = `\n\nDe transcriptie bevat meerdere sprekers. Gebruik deze informatie om taken toe te wijzen aan de genoemde personen.`;
      }

      // Create Dutch prompt for task extraction with priority assignment
      const systemPrompt = `Je bent een AI-assistent die Nederlandse vergadernotulen analyseert om actiepunten (taken) te extraheren.

Jouw taak:
1. Identificeer alle actiepunten en taken uit de transcriptie
2. Bepaal de prioriteit op basis van urgentie-indicatoren in de tekst
3. Zoek naar personen die verantwoordelijk worden gesteld
4. Schat indien mogelijk een deadline in

Prioriteit niveaus en indicatoren:
- **urgent**: ${this.PRIORITY_KEYWORDS.urgent.join(", ")}
- **high**: ${this.PRIORITY_KEYWORDS.high.join(", ")}
- **medium**: ${this.PRIORITY_KEYWORDS.medium.join(", ")}
- **low**: ${this.PRIORITY_KEYWORDS.low.join(", ")}

Let op urgentie-woorden in de context. Als iemand zegt "dit moet vandaag nog", is dat urgent.
Als er geen urgentie wordt genoemd, gebruik dan 'medium' als standaard.${speakerContext}

Antwoord ALLEEN met valid JSON in het volgende formaat:
{
  "tasks": [
    {
      "title": "Korte titel van de taak",
      "description": "Gedetailleerde beschrijving van wat er moet gebeuren",
      "priority": "low" | "medium" | "high" | "urgent",
      "assigneeName": "Naam van persoon (optioneel)",
      "dueDate": "ISO datum string (optioneel)",
      "confidenceScore": 0.0 tot 1.0,
      "meetingTimestamp": seconden in opname waar taak werd genoemd (optioneel)
    }
  ]
}`;

      const userPrompt = `Analyseer deze vergadertranscriptie en extraheer alle actiepunten met hun prioriteit:\n\n${transcriptionText}`;

      // Call OpenAI API with function calling for structured output
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        logger.error("No content in OpenAI response", {
          component: "TaskExtractionService.extractTasks",
        });
        return err(new Error("No response from OpenAI"));
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
        return err(new Error("Failed to parse task extraction response"));
      }

      if (!extractionResult.tasks || !Array.isArray(extractionResult.tasks)) {
        logger.error("Invalid task extraction format", {
          component: "TaskExtractionService.extractTasks",
          extractionResult,
        });
        return err(new Error("Invalid task extraction format"));
      }

      // Create tasks in database
      const createdTasks = [];
      for (const task of extractionResult.tasks) {
        const taskResult = await TasksQueries.createTask({
          recordingId,
          projectId,
          title: task.title,
          description: task.description ?? null,
          priority: task.priority,
          status: "pending",
          assigneeId: null, // Will be assigned later
          assigneeName: task.assigneeName ?? null,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          confidenceScore: task.confidenceScore ?? null,
          meetingTimestamp: task.meetingTimestamp ?? null,
          organizationId,
          createdById,
        });

        if (taskResult.isOk()) {
          createdTasks.push(taskResult.value);
        } else {
          logger.warn("Failed to create individual task", {
            component: "TaskExtractionService.extractTasks",
            task,
            error: taskResult.error,
          });
        }
      }

      logger.info("Task extraction completed", {
        component: "TaskExtractionService.extractTasks",
        recordingId,
        tasksExtracted: createdTasks.length,
        totalAttempted: extractionResult.tasks.length,
      });

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
        error instanceof Error
          ? error
          : new Error("Failed to extract tasks")
      );
    }
  }

  /**
   * Manually adjust task priority
   */
  static async updateTaskPriority(
    taskId: string,
    priority: "low" | "medium" | "high" | "urgent"
  ): Promise<Result<void, Error>> {
    try {
      const result = await TasksQueries.updateTask(taskId, { priority });
      
      if (result.isErr()) {
        return err(result.error);
      }

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
        error instanceof Error
          ? error
          : new Error("Failed to update task priority")
      );
    }
  }
}

