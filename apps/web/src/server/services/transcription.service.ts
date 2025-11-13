import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { createClient } from "@deepgram/sdk";
import { err, ok } from "neverthrow";
import OpenAI from "openai";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { NotificationService } from "./notification.service";

interface TranscriptionResult {
  text: string;
  confidence: number;
  speakers?: Speaker[];
  utterances?: Utterance[];
}

interface Speaker {
  id: number;
  name?: string;
  utterances: number;
}

interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export class TranscriptionService {
  private static getDeepgramClient() {
    if (!process.env.DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY environment variable is not set");
    }
    return createClient(process.env.DEEPGRAM_API_KEY);
  }

  /**
   * Transcribe an uploaded audio file using Deepgram Nova-3 Dutch
   */
  static async transcribeUploadedFile(
    recordingId: string,
    fileUrl: string
  ): Promise<ActionResult<TranscriptionResult>> {
    try {
      logger.info("Starting transcription for uploaded file", {
        component: "TranscriptionService.transcribeUploadedFile",
        recordingId,
        fileUrl,
      });

      // Update recording status to processing
      await RecordingsQueries.updateRecordingTranscriptionStatus(
        recordingId,
        "processing"
      );

      // Create AI insight record
      const insight = await AIInsightsQueries.createAIInsight({
        recordingId,
        insightType: "transcription",
        content: {},
        processingStatus: "processing",
      });

      // Get recording to fetch project/organization context
      const existingRecording = await RecordingsQueries.selectRecordingById(
        recordingId
      );
      if (!existingRecording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "TranscriptionService.transcribeUploadedFile"
          )
        );
      }

      // Fetch applicable knowledge base entries for this project
      const knowledgeResult = await KnowledgeBaseService.getApplicableKnowledge(
        existingRecording.projectId,
        existingRecording.organizationId
      );
      const knowledgeEntries = knowledgeResult.isOk()
        ? knowledgeResult.value
        : [];

      // Format knowledge entries as Deepgram keywords
      // Deepgram keywords format: array of strings (terms)
      const keywords = knowledgeEntries.map((entry) => entry.term);

      logger.info("Using knowledge base for transcription", {
        component: "TranscriptionService.transcribeUploadedFile",
        recordingId,
        keywordsCount: keywords.length,
        knowledgeEntriesUsed: knowledgeEntries.map((e) => e.id),
      });

      // Call Deepgram API with keywords
      const deepgram = this.getDeepgramClient();
      const deepgramOptions: {
        model: string;
        language: string;
        smart_format: boolean;
        diarize: boolean;
        punctuate: boolean;
        utterances: boolean;
        keywords?: string[];
      } = {
        model: "nova-3",
        language: "nl",
        smart_format: true,
        diarize: true,
        punctuate: true,
        utterances: true,
      };

      // Add keywords if available
      if (keywords.length > 0) {
        deepgramOptions.keywords = keywords;
      }

      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        { url: fileUrl },
        deepgramOptions
      );

      if (error) {
        logger.error("Deepgram transcription failed", {
          component: "TranscriptionService.transcribeUploadedFile",
          error,
        });

        await Promise.all([
          AIInsightsQueries.updateInsightStatus(
            insight.id,
            "failed",
            error.message
          ),
          RecordingsQueries.updateRecordingTranscriptionStatus(
            recordingId,
            "failed"
          ),
        ]);

        if (existingRecording) {
          await NotificationService.createNotification({
            recordingId,
            projectId: existingRecording.projectId,
            userId: existingRecording.createdById,
            organizationId: existingRecording.organizationId,
            type: "transcription_failed",
            title: "Transcriptie mislukt",
            message: `De transcriptie van "${existingRecording.title}" is mislukt.`,
            metadata: {
              error: error.message,
            },
          });
        }

        return err(
          ActionErrors.internal(
            `Transcription failed: ${error.message}`,
            new Error(error.message),
            "TranscriptionService.transcribeUploadedFile"
          )
        );
      }

      // Extract transcription data
      const channel = result?.results?.channels?.[0];
      const alternatives = channel?.alternatives?.[0];

      if (!alternatives?.transcript) {
        logger.error("No transcription text in response", {
          component: "TranscriptionService.transcribeUploadedFile",
        });
        return err(
          ActionErrors.internal(
            "No transcription text in response",
            undefined,
            "TranscriptionService.transcribeUploadedFile"
          )
        );
      }

      const transcriptionText = alternatives.transcript;
      const confidence = alternatives.confidence || 0;

      // Extract speakers and utterances
      const speakers: Speaker[] = [];
      const utterances: Utterance[] = [];

      if (channel?.alternatives?.[0]?.words) {
        const words = channel.alternatives[0].words;
        const speakerMap = new Map<number, number>();

        // Count utterances per speaker
        words.forEach((word: { speaker?: number }) => {
          if (word.speaker !== undefined) {
            speakerMap.set(
              word.speaker,
              (speakerMap.get(word.speaker) || 0) + 1
            );
          }
        });

        // Build speaker list
        speakerMap.forEach((count, speakerId) => {
          speakers.push({
            id: speakerId,
            utterances: count,
          });
        });
      }

      // Extract utterances if available
      if (result?.results?.utterances) {
        result.results.utterances.forEach(
          (utt: {
            speaker?: number;
            transcript: string;
            start: number;
            end: number;
            confidence: number;
          }) => {
            utterances.push({
              speaker: utt.speaker ?? 0,
              text: utt.transcript,
              start: utt.start,
              end: utt.end,
              confidence: utt.confidence,
            });
          }
        );
      }

      // Update AI insight with transcription data
      await AIInsightsQueries.updateInsightContent(
        insight.id,
        {
          text: transcriptionText,
          confidence,
          speakers,
          utterances,
          knowledgeUsed: knowledgeEntries.map((e) => e.id), // Track which knowledge entries were used
        },
        confidence
      );

      // Update recording with transcription text
      await RecordingsQueries.updateRecordingTranscription(
        recordingId,
        transcriptionText,
        "completed"
      );

      // Run post-transcription correction with knowledge base (non-blocking)
      this.correctTranscriptionWithKnowledge(
        transcriptionText,
        recordingId,
        existingRecording.projectId,
        existingRecording.organizationId
      ).catch((error) => {
        logger.warn("Failed to correct transcription with knowledge base", {
          recordingId,
          error,
        });
      });

      logger.info("Transcription completed successfully", {
        component: "TranscriptionService.transcribeUploadedFile",
        recordingId,
        speakersDetected: speakers.length,
        utterancesCount: utterances.length,
      });

      // Create success notification
      if (existingRecording) {
        await NotificationService.createNotification({
          recordingId,
          projectId: existingRecording.projectId,
          userId: existingRecording.createdById,
          organizationId: existingRecording.organizationId,
          type: "transcription_completed",
          title: "Transcriptie voltooid",
          message: `De transcriptie van "${existingRecording.title}" is voltooid.`,
          metadata: {
            speakersDetected: speakers.length,
            utterancesCount: utterances.length,
            confidence,
          },
        });
      }

      return ok({
        text: transcriptionText,
        confidence,
        speakers,
        utterances,
      });
    } catch (error) {
      logger.error("Error in transcription service", {
        component: "TranscriptionService.transcribeUploadedFile",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Unknown error during transcription",
          error as Error,
          "TranscriptionService.transcribeUploadedFile"
        )
      );
    }
  }

  /**
   * Save live transcription results to database
   */
  static async saveLiveTranscription(
    recordingId: string,
    transcriptionText: string,
    speakers: Speaker[],
    utterances: Utterance[],
    confidence: number
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Saving live transcription", {
        component: "TranscriptionService.saveLiveTranscription",
        recordingId,
      });

      // Create AI insight record
      await AIInsightsQueries.createAIInsight({
        recordingId,
        insightType: "transcription",
        content: {
          text: transcriptionText,
          confidence,
          speakers,
          utterances,
        },
        confidenceScore: confidence,
        processingStatus: "completed",
        speakersDetected: speakers.length,
        utterances,
      });

      // Update recording with transcription text
      await RecordingsQueries.updateRecordingTranscription(
        recordingId,
        transcriptionText,
        "completed"
      );

      logger.info("Live transcription saved successfully", {
        component: "TranscriptionService.saveLiveTranscription",
        recordingId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error saving live transcription", {
        component: "TranscriptionService.saveLiveTranscription",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to save live transcription",
          error as Error,
          "TranscriptionService.saveLiveTranscription"
        )
      );
    }
  }

  /**
   * Get Deepgram live streaming configuration
   */
  static getLiveStreamingConfig() {
    return {
      model: "nova-3",
      language: "nl",
      smart_format: true,
      diarize: true,
      punctuate: true,
      utterances: true,
      interim_results: true,
    };
  }

  /**
   * Post-transcription correction using knowledge base
   * Identifies misheard terms and corrects them using knowledge base entries
   * Stores corrections separately in AI insights metadata
   */
  static async correctTranscriptionWithKnowledge(
    transcriptionText: string,
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      // Fetch applicable knowledge base entries
      const knowledgeResult = await KnowledgeBaseService.getApplicableKnowledge(
        projectId,
        organizationId
      );
      if (knowledgeResult.isErr() || knowledgeResult.value.length === 0) {
        // No knowledge base entries, skip correction
        return ok(undefined);
      }

      const knowledgeEntries = knowledgeResult.value;

      // Use OpenAI to identify potential misheard terms
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY ?? "",
      });

      // Build knowledge context for correction prompt
      // Persists knowledge entry id so that the LLM can reference the correct entry.
      const knowledgeContext = knowledgeEntries
        .map((entry) => `${entry.id} | ${entry.term}: ${entry.definition}`)
        .join("\n");
      const systemPrompt = `Je bent een AI-assistent die transcripties corrigeert op basis van een kennisbank.

Kennisbank:
${knowledgeContext}

Je taak:
1. Identificeer termen in de transcriptie die mogelijk verkeerd zijn getranscribeerd
2. Vergelijk met de kennisbank om te zien of er termen zijn die mogelijk verkeerd zijn gehoord
3. Geef alleen correcties terug als je zeker bent dat een term verkeerd is getranscribeerd

Antwoord ALLEEN met valid JSON in het volgende formaat:
{
  "corrections": [
    {
      "original": "verkeerd getranscribeerde tekst",
      "corrected": "correcte tekst volgens kennisbank",
      "knowledgeEntryId": "id van kennisbank entry",
      "confidence": 0.0 tot 1.0
    }
  ]
}`;

      const userPrompt = `Analyseer deze transcriptie en identificeer mogelijke fouten op basis van de kennisbank:\n\n${transcriptionText}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        return ok(undefined);
      }

      let correctionData: {
        corrections?: Array<{
          original: string;
          corrected: string;
          knowledgeEntryId: string;
          confidence: number;
        }>;
      };
      try {
        correctionData = JSON.parse(responseContent);
      } catch (parseError) {
        logger.error("Failed to parse LLM response JSON", {
          component: "TranscriptionService.correctTranscriptionWithKnowledge",
          recordingId,
          parseError:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          rawResponseContent: responseContent,
        });
        return ok(undefined);
      }

      const corrections = correctionData.corrections ?? [];

      if (corrections.length === 0) {
        return ok(undefined);
      }

      // Get existing transcription insight
      const insights = await AIInsightsQueries.getInsightsByRecordingId(
        recordingId
      );
      const transcriptionInsight = insights.find(
        (i) => i.insightType === "transcription"
      );

      if (!transcriptionInsight) {
        logger.warn("Transcription insight not found for corrections", {
          recordingId,
        });
        return ok(undefined);
      }

      // Update insight with corrections
      const currentContent = transcriptionInsight.content as Record<
        string,
        unknown
      >;
      await AIInsightsQueries.updateInsightContent(
        transcriptionInsight.id,
        {
          ...currentContent,
          corrections: corrections.map((c) => ({
            original: c.original,
            corrected: c.corrected,
            knowledgeEntryId: c.knowledgeEntryId,
            confidence: c.confidence,
          })),
        },
        transcriptionInsight.confidenceScore ?? 0
      );

      logger.info("Transcription corrections applied", {
        component: "TranscriptionService.correctTranscriptionWithKnowledge",
        recordingId,
        correctionsCount: corrections.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to correct transcription with knowledge base",
        { recordingId },
        error as Error
      );
      // Don't fail the whole process if correction fails
      return ok(undefined);
    }
  }
}

