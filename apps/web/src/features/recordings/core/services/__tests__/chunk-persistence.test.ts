import "fake-indexeddb/auto";

import {
  type MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { PersistenceError } from "../../recording-session.errors";
import type {
  AudioChunk,
  SessionMetadata,
} from "../../recording-session.types";
import { AzureBlockUploader } from "../chunk-persistence/azure-block-uploader";
import type { ChunkPersistenceConfig } from "../chunk-persistence/chunk-persistence";
import { ChunkPersistenceServiceImpl } from "../chunk-persistence/chunk-persistence";
import { IndexedDBChunkStore } from "../chunk-persistence/indexed-db-store";

// --- Helpers ---

function createMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    projectId: "project-123",
    audioSource: "microphone",
    language: "en",
    startedAt: Date.now(),
    consent: { consentGiven: true, consentGivenAt: new Date().toISOString() },
    ...overrides,
  };
}

function createChunk(index: number, sizeBytes = 1024): AudioChunk {
  return {
    data: new Blob([new Uint8Array(sizeBytes)], { type: "audio/webm" }),
    index,
    timestamp: Date.now() + index * 1000,
    duration: 1000,
  };
}

function createConfig(
  overrides?: Partial<ChunkPersistenceConfig>,
): ChunkPersistenceConfig {
  return {
    requestSasToken: vi.fn().mockResolvedValue({
      uploadUrl:
        "https://storage.blob.core.windows.net/container/blob?sas=token",
      blobUrl: "https://storage.blob.core.windows.net/container/blob",
      pathname: "container/blob",
    }),
    onUploadComplete: vi.fn().mockResolvedValue({ recordingId: "rec-001" }),
    ...overrides,
  };
}

// --- Test Suite ---

describe("ChunkPersistenceServiceImpl", () => {
  let store: IndexedDBChunkStore;
  let service: ChunkPersistenceServiceImpl;
  let config: ChunkPersistenceConfig;
  let stageBlockSpy: MockInstance;
  let commitBlockListSpy: MockInstance;

  const SESSION_ID = "session-abc-123";

  beforeEach(() => {
    store = new IndexedDBChunkStore();
    config = createConfig();

    // Mock AzureBlockUploader methods
    stageBlockSpy = vi
      .spyOn(AzureBlockUploader.prototype, "stageBlock")
      .mockResolvedValue(undefined);
    commitBlockListSpy = vi
      .spyOn(AzureBlockUploader.prototype, "commitBlockList")
      .mockResolvedValue(undefined);
    vi.spyOn(AzureBlockUploader.prototype, "initialize").mockImplementation(
      () => undefined,
    );

    service = new ChunkPersistenceServiceImpl(store, config);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await store.clear();
  });

  // --- 1. initialize ---

  describe("initialize", () => {
    it("creates session in IndexedDB and requests SAS token", async () => {
      const metadata = createMetadata();

      const result = await service.initialize(SESSION_ID, metadata);

      expect(result.isOk()).toBe(true);
      expect(config.requestSasToken).toHaveBeenCalledOnce();

      // Verify session exists in IndexedDB by checking orphaned sessions
      // (an active session with recent startedAt will appear as orphaned)
      const orphaned = await store.getOrphanedSessions();
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0]!.sessionId).toBe(SESSION_ID);
    });

    it("returns PersistenceError when SAS token request fails", async () => {
      const failConfig = createConfig({
        requestSasToken: vi.fn().mockRejectedValue(new Error("Network error")),
      });
      const failService = new ChunkPersistenceServiceImpl(store, failConfig);

      const result = await failService.initialize(SESSION_ID, createMetadata());

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("SAS_TOKEN_ERROR");
      }
    });
  });

  // --- 2. persistChunk stores chunk in IndexedDB ---

  describe("persistChunk", () => {
    beforeEach(async () => {
      await service.initialize(SESSION_ID, createMetadata());
    });

    it("stores chunk in IndexedDB immediately", async () => {
      const chunk = createChunk(0);

      const result = await service.persistChunk(chunk);

      expect(result.isOk()).toBe(true);

      const storedChunks = await store.getChunks(SESSION_ID);
      expect(storedChunks).toHaveLength(1);
      expect(storedChunks[0]!.index).toBe(0);
    });

    it("updates manifest totalChunks and totalBytes", async () => {
      const chunk = createChunk(0, 512);
      await service.persistChunk(chunk);

      const manifest = service.getManifest();
      expect(manifest.totalChunks).toBe(1);
      expect(manifest.totalBytes).toBe(512);
      expect(manifest.sessionId).toBe(SESSION_ID);
    });
  });

  // --- 3. Buffer flush at 20 chunks ---

  describe("buffer flushing", () => {
    beforeEach(async () => {
      await service.initialize(SESSION_ID, createMetadata());
    });

    it("does not flush when buffer has fewer than 20 chunks", async () => {
      for (let i = 0; i < 19; i++) {
        await service.persistChunk(createChunk(i));
      }

      expect(stageBlockSpy).not.toHaveBeenCalled();
    });

    it("flushes buffer when it reaches 20 chunks", async () => {
      for (let i = 0; i < 20; i++) {
        await service.persistChunk(createChunk(i));
      }

      // Wait for fire-and-forget flush to complete
      await vi.waitFor(() => {
        expect(stageBlockSpy).toHaveBeenCalledOnce();
      });
    });

    it("generates sequential zero-padded block IDs", async () => {
      // First batch of 20
      for (let i = 0; i < 20; i++) {
        await service.persistChunk(createChunk(i));
      }
      await vi.waitFor(() => {
        expect(stageBlockSpy).toHaveBeenCalledOnce();
      });
      expect(stageBlockSpy).toHaveBeenCalledWith(
        "block-000001",
        expect.any(Blob),
      );

      // Second batch of 20
      for (let i = 20; i < 40; i++) {
        await service.persistChunk(createChunk(i));
      }
      await vi.waitFor(() => {
        expect(stageBlockSpy).toHaveBeenCalledTimes(2);
      });
      expect(stageBlockSpy).toHaveBeenCalledWith(
        "block-000002",
        expect.any(Blob),
      );
    });
  });

  // --- 4. stageBlock is called during flush ---

  describe("flush triggers stageBlock", () => {
    beforeEach(async () => {
      await service.initialize(SESSION_ID, createMetadata());
    });

    it("concatenates buffered chunks into a single Blob for stageBlock", async () => {
      const chunkSize = 256;
      for (let i = 0; i < 20; i++) {
        await service.persistChunk(createChunk(i, chunkSize));
      }

      await vi.waitFor(() => {
        expect(stageBlockSpy).toHaveBeenCalledOnce();
      });

      const stagedBlob = stageBlockSpy.mock.calls[0]![1] as Blob;
      expect(stagedBlob.size).toBe(20 * chunkSize);
    });

    it("marks chunks as uploaded in IndexedDB after successful flush", async () => {
      for (let i = 0; i < 20; i++) {
        await service.persistChunk(createChunk(i));
      }

      await vi.waitFor(() => {
        expect(stageBlockSpy).toHaveBeenCalledOnce();
      });

      // Allow marking uploaded to complete
      await vi.waitFor(async () => {
        const pending = await store.getPendingChunks(SESSION_ID);
        expect(pending).toHaveLength(0);
      });
    });
  });

  // --- 5. finalize ---

  describe("finalize", () => {
    beforeEach(async () => {
      await service.initialize(SESSION_ID, createMetadata());
    });

    it("flushes remaining buffer, commits block list, and returns FinalizedRecording", async () => {
      // Add fewer than 20 chunks (won't auto-flush)
      for (let i = 0; i < 5; i++) {
        await service.persistChunk(createChunk(i));
      }

      expect(stageBlockSpy).not.toHaveBeenCalled();

      const result = await service.finalize();

      expect(result.isOk()).toBe(true);

      // Buffer should have been flushed
      expect(stageBlockSpy).toHaveBeenCalledOnce();
      expect(stageBlockSpy).toHaveBeenCalledWith(
        "block-000001",
        expect.any(Blob),
      );

      // Block list should have been committed
      expect(commitBlockListSpy).toHaveBeenCalledOnce();
      expect(commitBlockListSpy).toHaveBeenCalledWith(["block-000001"]);

      // onUploadComplete callback should have been invoked
      expect(config.onUploadComplete).toHaveBeenCalledOnce();

      if (result.isOk()) {
        expect(result.value.fileUrl).toBe(
          "https://storage.blob.core.windows.net/container/blob",
        );
        expect(result.value.chunkCount).toBe(5);
      }
    });

    it("cleans up IndexedDB after finalization", async () => {
      await service.persistChunk(createChunk(0));
      await service.finalize();

      const orphaned = await store.getOrphanedSessions();
      expect(orphaned).toHaveLength(0);

      const chunks = await store.getChunks(SESSION_ID);
      expect(chunks).toHaveLength(0);
    });

    it("returns error when commitBlockList fails", async () => {
      commitBlockListSpy.mockRejectedValueOnce(new Error("Azure error"));
      await service.persistChunk(createChunk(0));

      const result = await service.finalize();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("COMMIT_FAILED");
      }
    });
  });

  // --- 6. getManifest ---

  describe("getManifest", () => {
    it("returns accurate counts after persisting and flushing", async () => {
      await service.initialize(SESSION_ID, createMetadata({ startedAt: 1000 }));

      const chunkSize = 100;
      for (let i = 0; i < 25; i++) {
        await service.persistChunk(createChunk(i, chunkSize));
      }

      // Wait for first flush (20 chunks)
      await vi.waitFor(() => {
        expect(stageBlockSpy).toHaveBeenCalledOnce();
      });

      // Wait for upload markers to complete
      await vi.waitFor(() => {
        const manifest = service.getManifest();
        expect(manifest.uploadedChunks).toBe(20);
      });

      const manifest = service.getManifest();
      expect(manifest.sessionId).toBe(SESSION_ID);
      expect(manifest.totalChunks).toBe(25);
      expect(manifest.uploadedChunks).toBe(20);
      expect(manifest.pendingChunks).toBe(5);
      expect(manifest.totalBytes).toBe(25 * chunkSize);
      expect(manifest.startedAt).toBe(1000);
    });
  });

  // --- 7. Orphaned session recovery ---

  describe("orphaned session handling", () => {
    it("hasOrphanedSession returns false when no active sessions exist", async () => {
      const hasOrphaned = await service.hasOrphanedSession();
      expect(hasOrphaned).toBe(false);
    });

    it("hasOrphanedSession returns true when an active session exists", async () => {
      await store.createSession("orphan-session", createMetadata());

      const hasOrphaned = await service.hasOrphanedSession();
      expect(hasOrphaned).toBe(true);
    });

    it("recoverSession returns session data for orphaned session", async () => {
      const metadata = createMetadata();
      await store.createSession("orphan-session", metadata);
      const chunk = createChunk(0);
      await store.putChunk("orphan-session", chunk);

      const recovered = await service.recoverSession();

      expect(recovered).not.toBeNull();
      expect(recovered!.sessionId).toBe("orphan-session");
      expect(recovered!.chunks).toHaveLength(1);
      expect(recovered!.metadata).toEqual(metadata);
    });

    it("recoverSession returns null when no orphaned sessions exist", async () => {
      const recovered = await service.recoverSession();
      expect(recovered).toBeNull();
    });

    it("discardOrphanedSession removes session from IndexedDB", async () => {
      await store.createSession("orphan-session", createMetadata());

      await service.discardOrphanedSession();

      const orphaned = await store.getOrphanedSessions();
      expect(orphaned).toHaveLength(0);
    });
  });

  // --- 8. abort ---

  describe("abort", () => {
    beforeEach(async () => {
      await service.initialize(SESSION_ID, createMetadata());
    });

    it("cleans up IndexedDB without committing blocks", async () => {
      for (let i = 0; i < 5; i++) {
        await service.persistChunk(createChunk(i));
      }

      const result = await service.abort();

      expect(result.isOk()).toBe(true);
      expect(commitBlockListSpy).not.toHaveBeenCalled();

      const chunks = await store.getChunks(SESSION_ID);
      expect(chunks).toHaveLength(0);

      const orphaned = await store.getOrphanedSessions();
      expect(orphaned).toHaveLength(0);
    });

    it("works even when no chunks have been persisted", async () => {
      const result = await service.abort();

      expect(result.isOk()).toBe(true);
      expect(commitBlockListSpy).not.toHaveBeenCalled();
    });
  });
});
