import "fake-indexeddb/auto";

import { IndexedDBChunkStore } from "../chunk-persistence/indexed-db-store";
import type {
  AudioChunk,
  SessionMetadata,
} from "../../recording-session.types";

function makeChunk(index: number): AudioChunk {
  return {
    data: new Blob([`chunk-${index}`], { type: "audio/webm" }),
    index,
    timestamp: Date.now(),
    duration: 250,
  };
}

const testMetadata: SessionMetadata = {
  projectId: "proj-1",
  audioSource: "microphone",
  language: "nl",
  startedAt: Date.now(),
  consent: { consentGiven: true, consentGivenAt: new Date().toISOString() },
};

describe("IndexedDBChunkStore", () => {
  let store: IndexedDBChunkStore;

  beforeEach(async () => {
    store = new IndexedDBChunkStore();
  });

  afterEach(async () => {
    await store.clear();
  });

  it("creates a session and stores chunks", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));
    await store.putChunk("session-1", makeChunk(1));

    const chunks = await store.getChunks("session-1");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].index).toBe(0);
    expect(chunks[1].index).toBe(1);
  });

  it("marks chunks as uploaded", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));
    await store.markUploaded("session-1", 0);

    const pending = await store.getPendingChunks("session-1");
    expect(pending).toHaveLength(0);
  });

  it("detects orphaned sessions", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));

    const orphaned = await store.getOrphanedSessions();
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0].sessionId).toBe("session-1");
  });

  it("finalizes and cleans up a session", async () => {
    await store.createSession("session-1", testMetadata);
    await store.putChunk("session-1", makeChunk(0));
    await store.finalizeSession("session-1");

    const orphaned = await store.getOrphanedSessions();
    expect(orphaned).toHaveLength(0);
  });

  it("excludes expired sessions from getOrphanedSessions", async () => {
    const oldMetadata = {
      ...testMetadata,
      startedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    };
    await store.createSession("old-session", oldMetadata);
    await store.putChunk("old-session", makeChunk(0));

    const orphaned = await store.getOrphanedSessions(7 * 24 * 60 * 60 * 1000);
    expect(orphaned).toHaveLength(0);
  });

  it("cleanupExpiredSessions removes expired sessions", async () => {
    const oldMetadata = {
      ...testMetadata,
      startedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    };
    await store.createSession("old-session", oldMetadata);
    await store.putChunk("old-session", makeChunk(0));

    await store.cleanupExpiredSessions(7 * 24 * 60 * 60 * 1000);

    const chunks = await store.getChunks("old-session");
    expect(chunks).toHaveLength(0);
  });
});
