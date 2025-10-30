import OpenAI from "openai";
import { err, ok, Result } from "neverthrow";
import { logger } from "@/lib/logger";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { CacheService } from "./cache.service";

interface SummaryContent {
  hoofdonderwerpen: string[];
  beslissingen: string[];
  sprekersBijdragen: {
    spreker: string;
    bijdragen: string[];
  }[];
  belangrijkeQuotes: {
    spreker: string;
    quote: string;
  }[];
}

interface SummaryResult {
  content: SummaryContent;
  confidence: number;
}

export class SummaryService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  });

  private static readonly CACHE_PREFIX = "summary:";
  private static readonly CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

  /**
   * Generate meeting summary from transcription using OpenAI GPT-4
   */
  static async generateSummary(
    recordingId: string,
    transcriptionText: string,
    utterances?: Array<{ speaker: number; text: string }>
  ): Promise<Result<SummaryResult, Error>> {
    try {
      logger.info("Starting summary generation", {
        component: "SummaryService.generateSummary",
        recordingId,
        transcriptionLength: transcriptionText.length,
      });

      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${recordingId}`;
      const cachedResult = await CacheService.get<SummaryResult>(cacheKey);

      if (cachedResult.isOk() && cachedResult.value) {
        logger.info("Returning cached summary", {
          component: "SummaryService.generateSummary",
          recordingId,
        });
        return ok(cachedResult.value);
      }

      // Create AI insight record
      const insightResult = await AIInsightsQueries.createAIInsight({
        recordingId,
        insightType: "summary",
        content: {},
        processingStatus: "processing",
      });

      if (insightResult.isErr()) {
        return err(insightResult.error);
      }

      const insight = insightResult.value;

      // Prepare speaker context if available
      let speakerContext = "";
      if (utterances && utterances.length > 0) {
        const uniqueSpeakers = [
          ...new Set(utterances.map((u) => u.speaker)),
        ].sort();
        speakerContext = `\n\nDe transcriptie bevat ${uniqueSpeakers.length} verschillende spreker${uniqueSpeakers.length > 1 ? "s" : ""}.`;
      }

      // Create prompt for Dutch meeting summary
      const systemPrompt = `Je bent een AI-assistent die Nederlandse vergadernotulen analyseert en samenvat.

Je taak is om een gestructureerde samenvatting te maken van de vergadertranscriptie.

Analyseer de transcriptie en maak een samenvatting met de volgende structuur:
1. Hoofdonderwerpen besproken: Een lijst van de belangrijkste onderwerpen die zijn besproken
2. Beslissingen: Een lijst van beslissingen die tijdens de vergadering zijn genomen
3. Sprekersbijdragen: Voor elke geïdentificeerde spreker, een lijst van hun belangrijkste bijdragen
4. Belangrijke quotes: Memorabele of belangrijke uitspraken van sprekers

Houd de samenvatting beknopt maar informatief. Focus op actie items en beslissingen.${speakerContext}

Antwoord ALLEEN met valid JSON in het volgende formaat:
{
  "hoofdonderwerpen": ["onderwerp 1", "onderwerp 2"],
  "beslissingen": ["beslissing 1", "beslissing 2"],
  "sprekersBijdragen": [
    {
      "spreker": "Spreker 1",
      "bijdragen": ["bijdrage 1", "bijdrage 2"]
    }
  ],
  "belangrijkeQuotes": [
    {
      "spreker": "Spreker 1",
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
        return err(new Error("No content in OpenAI response"));
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
        return err(new Error("Failed to parse OpenAI response"));
      }

      // Calculate confidence based on usage and response quality
      const confidence = 0.85; // GPT-4 is generally high confidence

      const result: SummaryResult = {
        content: summaryContent,
        confidence,
      };

      // Update AI insight with summary
      await AIInsightsQueries.updateInsightContent(
        insight.id,
        summaryContent,
        confidence
      );

      // Cache the result
      await CacheService.set(cacheKey, result, this.CACHE_TTL);

      logger.info("Summary generated successfully", {
        component: "SummaryService.generateSummary",
        recordingId,
        topicsCount: summaryContent.hoofdonderwerpen?.length || 0,
        decisionsCount: summaryContent.beslissingen?.length || 0,
      });

      return ok(result);
    } catch (error) {
      logger.error("Error generating summary", {
        component: "SummaryService.generateSummary",
        recordingId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to generate summary")
      );
    }
  }

  /**
   * Invalidate cached summary for a recording
   */
  static async invalidateSummaryCache(
    recordingId: string
  ): Promise<Result<void, Error>> {
    const cacheKey = `${this.CACHE_PREFIX}${recordingId}`;
    return CacheService.delete(cacheKey);
  }
}

