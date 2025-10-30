import { createClient } from "@deepgram/sdk";
import { err, ok, Result } from "neverthrow";
import { logger } from "@/lib/logger";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";

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
  private static deepgram = createClient(
    process.env.DEEPGRAM_API_KEY || ""
  );

  /**
   * Transcribe an uploaded audio file using Deepgram Nova-3 Dutch
   */
  static async transcribeUploadedFile(
    recordingId: string,
    fileUrl: string
  ): Promise<Result<TranscriptionResult, Error>> {
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
      const insightResult = await AIInsightsQueries.createAIInsight({
        recordingId,
        insightType: "transcription",
        content: {},
        processingStatus: "processing",
      });

      if (insightResult.isErr()) {
        logger.error("Failed to create AI insight record", {
          component: "TranscriptionService.transcribeUploadedFile",
          error: insightResult.error,
        });
        return err(insightResult.error);
      }

      const insight = insightResult.value;

      // Call Deepgram API
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeUrl(
        { url: fileUrl },
        {
          model: "nova-3",
          language: "nl",
          smart_format: true,
          diarize: true,
          punctuate: true,
          utterances: true,
        }
      );

      if (error) {
        logger.error("Deepgram transcription failed", {
          component: "TranscriptionService.transcribeUploadedFile",
          error,
        });

        await AIInsightsQueries.updateInsightStatus(
          insight.id,
          "failed",
          error.message
        );

        await RecordingsQueries.updateRecordingTranscriptionStatus(
          recordingId,
          "failed"
        );

        return err(new Error(`Transcription failed: ${error.message}`));
      }

      // Extract transcription data
      const channel = result?.results?.channels?.[0];
      const alternatives = channel?.alternatives?.[0];
      
      if (!alternatives?.transcript) {
        logger.error("No transcription text in response", {
          component: "TranscriptionService.transcribeUploadedFile",
        });
        return err(new Error("No transcription text in response"));
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
        words.forEach((word: {speaker?: number}) => {
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
        result.results.utterances.forEach((utt: {
          speaker: number;
          transcript: string;
          start: number;
          end: number;
          confidence: number;
        }) => {
          utterances.push({
            speaker: utt.speaker,
            text: utt.transcript,
            start: utt.start,
            end: utt.end,
            confidence: utt.confidence,
          });
        });
      }

      // Update AI insight with transcription data
      await AIInsightsQueries.updateInsightContent(insight.id, {
        text: transcriptionText,
        confidence,
        speakers,
        utterances,
      }, confidence);

      // Update recording with transcription text
      await RecordingsQueries.updateRecordingTranscription(
        recordingId,
        transcriptionText,
        "completed"
      );

      logger.info("Transcription completed successfully", {
        component: "TranscriptionService.transcribeUploadedFile",
        recordingId,
        speakersDetected: speakers.length,
        utterancesCount: utterances.length,
      });

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
        error instanceof Error
          ? error
          : new Error("Unknown error during transcription")
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
  ): Promise<Result<void, Error>> {
    try {
      logger.info("Saving live transcription", {
        component: "TranscriptionService.saveLiveTranscription",
        recordingId,
      });

      // Create AI insight record
      const insightResult = await AIInsightsQueries.createAIInsight({
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

      if (insightResult.isErr()) {
        return err(insightResult.error);
      }

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
        error instanceof Error
          ? error
          : new Error("Failed to save live transcription")
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
}

