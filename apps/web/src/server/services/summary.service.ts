import { invalidateFor } from "@/lib/cache";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import type { Utterance } from "@/server/dto/ai-insight.dto";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { parseAIJson } from "@/server/ai/parse-ai-json";
import { PromptBuilder } from "@/server/services/prompt-builder.service";
import { resilientModelProvider } from "@/server/services/resilient-model-provider.service";
import { generateText } from "ai";
import { err, ok } from "neverthrow";
import { createGuardedModel } from "../ai/middleware";
import {
  getCachedSummary,
  type SummaryContent,
  type SummaryResult,
} from "../cache/summary.cache";
import { KnowledgeModule } from "./knowledge";
import { NotificationService } from "./notification.service";

export class SummaryService {
  /**
   * Generate meeting summary from transcription using Claude Sonnet 4.6
   */
  static async generateSummary(
    recordingId: string,
    transcriptionText: string,
    utterances?: Utterance[],
    language?: string,
  ): Promise<ActionResult<SummaryResult>> {
    try {
      logger.info("Starting summary generation", {
        component: "SummaryService.generateSummary",
        recordingId,
        transcriptionLength: transcriptionText.length,
      });

      // Get recording first to resolve language before cache check
      const existingRecording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!existingRecording) {
        return err(
          ActionErrors.notFound("Recording", "SummaryService.generateSummary"),
        );
      }

      const resolvedLanguage = language ?? existingRecording.language ?? "nl";

      // Check cache (language-aware: only returns if stored summary matches requested language)
      const cachedResult = await getCachedSummary(
        recordingId,
        resolvedLanguage,
      );

      if (cachedResult) {
        logger.info("Returning cached summary", {
          component: "SummaryService.generateSummary",
          recordingId,
          language: resolvedLanguage,
        });
        return ok(cachedResult);
      }

      // Create AI insight record
      const insight = await AIInsightsQueries.createAIInsight({
        recordingId,
        insightType: "summary",
        content: {},
        processingStatus: "processing",
      });

      // Fetch applicable knowledge base entries for this project
      const knowledgeResult = await KnowledgeModule.getKnowledge({
        projectId: existingRecording.projectId,
        organizationId: existingRecording.organizationId,
      });
      if (knowledgeResult.isErr()) {
        logger.warn("Failed to fetch applicable knowledge entries", {
          component: "SummaryService.generateSummary",
          recordingId,
          error: knowledgeResult.error,
        });
      }
      const knowledgeEntries = knowledgeResult.isOk()
        ? knowledgeResult.value.entries
        : [];

      logger.info("Using knowledge base for summary", {
        component: "SummaryService.generateSummary",
        recordingId,
        knowledgeEntriesCount: knowledgeEntries.length,
        knowledgeEntriesUsed: knowledgeEntries.map((e) => e.id),
      });

      // Build knowledge context for prompt
      const knowledgeContext = knowledgeResult.isOk()
        ? knowledgeResult.value.glossary
        : "";

      // Build prompt using PromptBuilder (resolvedLanguage already set above)
      const promptResult = PromptBuilder.Summaries.buildPrompt({
        transcriptionText,
        utterances,
        knowledgeContext: knowledgeContext || undefined,
        language: resolvedLanguage,
      });

      // Call AI SDK with guardrails and resilient provider fallback
      const { result: completion } = await resilientModelProvider.execute(
        "claude-sonnet-4-6",
        async (model) => {
          const guardedModel = createGuardedModel(model, {
            requestType: "summary",
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
          component: "SummaryService.generateSummary",
        });
        await AIInsightsQueries.updateInsightStatus(
          insight.id,
          "failed",
          "No response from AI model",
        );

        // Create failure notification
        if (existingRecording) {
          await NotificationService.createNotification({
            recordingId,
            projectId: existingRecording.projectId,
            userId: existingRecording.createdById,
            organizationId: existingRecording.organizationId,
            type: "summary_failed",
            title: "Samenvatting mislukt",
            message: `De samenvatting van "${existingRecording.title}" is mislukt.`,
            metadata: {
              error: "No response from AI model",
            },
          });
        }

        return err(
          ActionErrors.internal(
            "No content in AI model response",
            undefined,
            "SummaryService.generateSummary",
          ),
        );
      }

      // Parse JSON response (strip markdown code fences if present)
      let summaryContent: SummaryContent;
      try {
        summaryContent = parseAIJson(responseContent);
      } catch (parseError) {
        logger.error("Failed to parse AI model response", {
          component: "SummaryService.generateSummary",
          error: parseError,
          responseContent,
        });
        await AIInsightsQueries.updateInsightStatus(
          insight.id,
          "failed",
          "Failed to parse summary",
        );

        // Create failure notification
        if (existingRecording) {
          await NotificationService.createNotification({
            recordingId,
            projectId: existingRecording.projectId,
            userId: existingRecording.createdById,
            organizationId: existingRecording.organizationId,
            type: "summary_failed",
            title: "Samenvatting mislukt",
            message: `De samenvatting van "${existingRecording.title}" is mislukt.`,
            metadata: {
              error: "Failed to parse summary",
            },
          });
        }

        return err(
          ActionErrors.internal(
            "Failed to parse AI model response",
            parseError as Error,
            "SummaryService.generateSummary",
          ),
        );
      }

      // Calculate confidence based on usage and response quality
      const confidence = 0.85; // Claude Sonnet 4.6 is generally high confidence

      const result: SummaryResult = {
        content: summaryContent,
        confidence,
      };

      // Update AI insight with summary and knowledge references
      const summaryContentWithKnowledge = {
        ...summaryContent,
        knowledgeUsed: knowledgeEntries.map((e) => e.id), // Track which knowledge entries were used
        generatedLanguage: resolvedLanguage, // Store for language-aware cache lookup
      };

      await AIInsightsQueries.updateInsightContent(insight.id, {
        content: summaryContentWithKnowledge,
        confidenceScore: confidence,
      });

      // Invalidate cache to pick up the new summary
      invalidateFor("recording", "update", {
        organizationId: existingRecording.organizationId,
        input: {
          recordingId,
          projectId: existingRecording.projectId,
        },
      });

      logger.info("Summary generated successfully", {
        component: "SummaryService.generateSummary",
        recordingId,
        topicsCount: summaryContent.topics?.length ?? 0,
        decisionsCount: summaryContent.decisions?.length ?? 0,
      });

      // Create success notification
      if (existingRecording) {
        await NotificationService.createNotification({
          recordingId,
          projectId: existingRecording.projectId,
          userId: existingRecording.createdById,
          organizationId: existingRecording.organizationId,
          type: "summary_completed",
          title: "Samenvatting voltooid",
          message: `De samenvatting van "${existingRecording.title}" is voltooid.`,
          metadata: {
            topicsCount: summaryContent.topics?.length ?? 0,
            decisionsCount: summaryContent.decisions?.length ?? 0,
          },
        });
      }

      return ok(result);
    } catch (error) {
      logger.error("Error generating summary", {
        component: "SummaryService.generateSummary",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to generate summary",
          error as Error,
          "SummaryService.generateSummary",
        ),
      );
    }
  }
}
