import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/data-access/bot-sessions.queries", () => ({
  BotSessionsQueries: {
    findByRecallBotIdOnly: vi.fn(),
  },
}));

vi.mock("@/server/data-access/transcript-chunks.queries", () => ({
  TranscriptChunksQueries: {
    insertChunk: vi.fn(),
  },
}));

import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { TranscriptChunksQueries } from "@/server/data-access/transcript-chunks.queries";
import { BotWebhookService } from "../bot-webhook.service";
import type { TranscriptDataEvent } from "@/server/validation/bot/recall-webhook.schema";

const makeTranscriptEvent = (
  overrides?: Partial<TranscriptDataEvent>,
): TranscriptDataEvent => ({
  event: "transcript.data",
  data: {
    data: {
      words: [
        {
          text: "Goedemorgen",
          start_timestamp: { relative: 1.5 },
          end_timestamp: { relative: 2.1 },
        },
        {
          text: "iedereen",
          start_timestamp: { relative: 2.2 },
          end_timestamp: { relative: 2.8 },
        },
      ],
      participant: {
        id: 1,
        name: "Jan de Vries",
        is_host: true,
        platform: "google_meet",
      },
    },
    bot: {
      id: "recall-bot-123",
      metadata: {
        organizationId: "org-1",
        projectId: "project-1",
        userId: "user-1",
      },
    },
  },
  ...overrides,
});

describe("BotWebhookService.processTranscriptData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores transcript chunk from webhook event", async () => {
    vi.mocked(BotSessionsQueries.findByRecallBotIdOnly).mockResolvedValue({
      id: "session-1",
      recordingId: "rec-1",
    } as never);

    vi.mocked(TranscriptChunksQueries.insertChunk).mockResolvedValue(
      {} as never,
    );

    const event = makeTranscriptEvent();
    const result = await BotWebhookService.processTranscriptData(event);

    expect(result.isOk()).toBe(true);

    expect(BotSessionsQueries.findByRecallBotIdOnly).toHaveBeenCalledWith(
      "recall-bot-123",
    );

    expect(TranscriptChunksQueries.insertChunk).toHaveBeenCalledWith(
      expect.objectContaining({
        botSessionId: "session-1",
        recordingId: "rec-1",
        speakerId: "Jan de Vries",
        text: "Goedemorgen iedereen",
        startTime: 1.5,
        endTime: 2.8,
        isFinal: true,
      }),
    );
  });

  it("uses Speaker ID when participant name is null", async () => {
    vi.mocked(BotSessionsQueries.findByRecallBotIdOnly).mockResolvedValue({
      id: "session-1",
      recordingId: null,
    } as never);

    vi.mocked(TranscriptChunksQueries.insertChunk).mockResolvedValue(
      {} as never,
    );

    const event = makeTranscriptEvent();
    event.data.data.participant.name = null;

    const result = await BotWebhookService.processTranscriptData(event);

    expect(result.isOk()).toBe(true);
    expect(TranscriptChunksQueries.insertChunk).toHaveBeenCalledWith(
      expect.objectContaining({
        speakerId: "Speaker 1",
      }),
    );
  });

  it("skips when bot session not found", async () => {
    vi.mocked(BotSessionsQueries.findByRecallBotIdOnly).mockResolvedValue(null);

    const event = makeTranscriptEvent();
    const result = await BotWebhookService.processTranscriptData(event);

    expect(result.isOk()).toBe(true);
    expect(TranscriptChunksQueries.insertChunk).not.toHaveBeenCalled();
  });

  it("skips when no words in event", async () => {
    vi.mocked(BotSessionsQueries.findByRecallBotIdOnly).mockResolvedValue({
      id: "session-1",
      recordingId: null,
    } as never);

    const event = makeTranscriptEvent();
    event.data.data.words = [];

    const result = await BotWebhookService.processTranscriptData(event);

    expect(result.isOk()).toBe(true);
    expect(TranscriptChunksQueries.insertChunk).not.toHaveBeenCalled();
  });
});
