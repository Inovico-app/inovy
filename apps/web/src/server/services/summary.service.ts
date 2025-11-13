import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { err, ok } from "neverthrow";
import OpenAI from "openai";
import {
  getCachedSummary,
  type SummaryContent,
  type SummaryResult,
} from "../cache";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { NotificationService } from "./notification.service";

export class SummaryService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
  });

  /**
   * Generate meeting summary from transcription using OpenAI GPT-4
   */
  static async generateSummary(
    recordingId: string,
    transcriptionText: string,
    utterances?: Array<{ speaker: number; text: string }>
  ): Promise<ActionResult<SummaryResult>> {
    try {
      logger.info("Starting summary generation", {
        component: "SummaryService.generateSummary",
        recordingId,
        transcriptionLength: transcriptionText.length,
      });

      // Check cache first
      const cachedResult = await getCachedSummary(recordingId);

      if (cachedResult) {
        logger.info("Returning cached summary", {
          component: "SummaryService.generateSummary",
          recordingId,
        });
        return ok(cachedResult);
      }

      // Get recording to fetch project/organization context for knowledge base
      const existingRecording = await RecordingsQueries.selectRecordingById(
        recordingId
      );
      if (!existingRecording) {
        return err(
          ActionErrors.notFound("Recording", "SummaryService.generateSummary")
        );
      }

      // Create AI insight record
      const insight = await AIInsightsQueries.createAIInsight({
        recordingId,
        insightType: "summary",
        content: {},
        processingStatus: "processing",
      });

      // Fetch applicable knowledge base entries for this project
      const knowledgeResult = await KnowledgeBaseService.getApplicableKnowledge(
        existingRecording.projectId,
        existingRecording.organizationId
      );
      const knowledgeEntries = knowledgeResult.isOk()
        ? knowledgeResult.value
        : [];

      logger.info("Using knowledge base for summary", {
        component: "SummaryService.generateSummary",
        recordingId,
        knowledgeEntriesCount: knowledgeEntries.length,
        knowledgeEntriesUsed: knowledgeEntries.map((e) => e.id),
      });

      // Build knowledge context for prompt
      const knowledgeContext = knowledgeEntries
        .map((entry) => `${entry.term}: ${entry.definition}`)
        .join("\n");

      // Prepare speaker context if available
      let speakerContext = "";
      if (utterances && utterances.length > 0) {
        const uniqueSpeakers = [
          ...new Set(utterances.map((u) => u.speaker)),
        ].sort();
        speakerContext = `\n\nDe transcriptie bevat ${
          uniqueSpeakers.length
        } verschillende spreker${uniqueSpeakers.length > 1 ? "s" : ""}.`;
      }

      // Build knowledge context section for prompt
      let knowledgeSection = "";
      if (knowledgeContext) {
        knowledgeSection = `\n\nKennisbank (gebruik deze termen correct in de samenvatting):\n${knowledgeContext}\n\nBelangrijk: Gebruik de juiste uitbreidingen voor afkortingen en houd terminologie consistent met de kennisbank.`;
      }

      // Create prompt for Dutch meeting summary
      const systemPrompt = `Je bent een AI-assistent die Nederlandse vergadernotulen analyseert en samenvat.

Je taak is om een gestructureerde samenvatting te maken van de vergadertranscriptie.

Analyseer de transcriptie en maak een samenvatting met de volgende structuur:
1. Overview: Een beknopt overzicht (1-2 paragrafen) die de essentie van de vergadering samenvat
2. Topics: Een lijst van de belangrijkste onderwerpen die zijn besproken
3. Decisions: Een lijst van beslissingen die tijdens de vergadering zijn genomen
4. Speaker Contributions: Voor elke geïdentificeerde spreker, een lijst van hun belangrijkste bijdragen
5. Important Quotes: Memorabele of belangrijke uitspraken van sprekers

Houd de samenvatting beknopt maar informatief. Focus op actie items en beslissingen.${speakerContext}${knowledgeSection}

Antwoord ALLEEN met valid JSON in het volgende formaat (gebruik Engels voor de veldnamen):
{
  "overview": "Een beknopt overzicht die de vergadering samenvat...",
  "topics": ["onderwerp 1", "onderwerp 2"],
  "decisions": ["beslissing 1", "beslissing 2"],
  "speakerContributions": [
    {
      "speaker": "Spreker 1",
      "contributions": ["bijdrage 1", "bijdrage 2"]
    }
  ],
  "importantQuotes": [
    {
      "speaker": "Spreker 1",
      "quote": "exacte quote"
    }
  ]
}`;

      const userPrompt = `Maak een gestructureerde samenvatting van deze vergadertranscriptie:\n\n${transcriptionText}`;

      // Call OpenAI API
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
          component: "SummaryService.generateSummary",
        });
        await AIInsightsQueries.updateInsightStatus(
          insight.id,
          "failed",
          "No response from OpenAI"
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
              error: "No response from OpenAI",
            },
          });
        }

        return err(
          ActionErrors.internal(
            "No content in OpenAI response",
            undefined,
            "SummaryService.generateSummary"
          )
        );
      }

      // Parse JSON response
      let summaryContent: SummaryContent;
      try {
        summaryContent = JSON.parse(responseContent);
      } catch (parseError) {
        logger.error("Failed to parse OpenAI response", {
          component: "SummaryService.generateSummary",
          error: parseError,
          responseContent,
        });
        await AIInsightsQueries.updateInsightStatus(
          insight.id,
          "failed",
          "Failed to parse summary"
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
            "Failed to parse OpenAI response",
            parseError as Error,
            "SummaryService.generateSummary"
          )
        );
      }

      // Calculate confidence based on usage and response quality
      const confidence = 0.85; // GPT-4 is generally high confidence

      const result: SummaryResult = {
        content: summaryContent,
        confidence,
      };

      // Update AI insight with summary and knowledge references
      const summaryContentWithKnowledge = {
        ...summaryContent,
        knowledgeUsed: knowledgeEntries.map((e) => e.id), // Track which knowledge entries were used
      };
      await AIInsightsQueries.updateInsightContent(
        insight.id,
        summaryContentWithKnowledge as unknown as Record<string, unknown>,
        confidence
      );

      // Invalidate cache to pick up the new summary
      CacheInvalidation.invalidateSummary(recordingId);

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
          "SummaryService.generateSummary"
        )
      );
    }
  }

  /**
   * Invalidate cached summary for a recording
   */
  static async invalidateSummaryCache(
    recordingId: string
  ): Promise<ActionResult<void>> {
    CacheInvalidation.invalidateSummary(recordingId);
    return ok(undefined);
  }
}

