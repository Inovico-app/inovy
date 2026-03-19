import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type {
  AudioChunk,
  SessionMetadata,
} from "../../recording-session.types";

// --- Database Schema ---

interface StoredSession {
  sessionId: string;
  metadata: SessionMetadata;
  status: "active" | "finalized";
  createdAt: number;
}

interface StoredChunk {
  key: string; // "sessionId:index"
  sessionId: string;
  index: number;
  data: Blob;
  timestamp: number;
  duration: number;
  uploaded: boolean;
}

interface RecordingChunkDB extends DBSchema {
  sessions: {
    key: string;
    value: StoredSession;
  };
  chunks: {
    key: string;
    value: StoredChunk;
    indexes: {
      "by-session": string;
    };
  };
}

// --- Constants ---

const DB_NAME = "inovy-recording-chunks";
const DB_VERSION = 1;
const DEFAULT_ORPHAN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// --- IndexedDB Chunk Store ---

export class IndexedDBChunkStore {
  private dbPromise: Promise<IDBPDatabase<RecordingChunkDB>> | null = null;

  private getDB(): Promise<IDBPDatabase<RecordingChunkDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<RecordingChunkDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("sessions")) {
            db.createObjectStore("sessions", { keyPath: "sessionId" });
          }

          if (!db.objectStoreNames.contains("chunks")) {
            const chunkStore = db.createObjectStore("chunks", {
              keyPath: "key",
            });
            chunkStore.createIndex("by-session", "sessionId");
          }
        },
      });
    }

    return this.dbPromise;
  }

  private makeChunkKey(sessionId: string, index: number): string {
    return `${sessionId}:${index}`;
  }

  async createSession(
    sessionId: string,
    metadata: SessionMetadata,
  ): Promise<void> {
    const db = await this.getDB();
    const session: StoredSession = {
      sessionId,
      metadata,
      status: "active",
      createdAt: Date.now(),
    };
    await db.put("sessions", session);
  }

  async putChunk(sessionId: string, chunk: AudioChunk): Promise<void> {
    const db = await this.getDB();
    const stored: StoredChunk = {
      key: this.makeChunkKey(sessionId, chunk.index),
      sessionId,
      index: chunk.index,
      data: chunk.data,
      timestamp: chunk.timestamp,
      duration: chunk.duration,
      uploaded: false,
    };
    await db.put("chunks", stored);
  }

  async markUploaded(sessionId: string, chunkIndex: number): Promise<void> {
    const db = await this.getDB();
    const key = this.makeChunkKey(sessionId, chunkIndex);
    const chunk = await db.get("chunks", key);
    if (!chunk) {
      return;
    }
    chunk.uploaded = true;
    await db.put("chunks", chunk);
  }

  async getChunks(sessionId: string): Promise<AudioChunk[]> {
    const db = await this.getDB();
    const allChunks = await db.getAllFromIndex(
      "chunks",
      "by-session",
      sessionId,
    );

    return allChunks
      .sort((a, b) => a.index - b.index)
      .map((stored) => ({
        data: stored.data,
        index: stored.index,
        timestamp: stored.timestamp,
        duration: stored.duration,
      }));
  }

  async getPendingChunks(sessionId: string): Promise<AudioChunk[]> {
    const db = await this.getDB();
    const allChunks = await db.getAllFromIndex(
      "chunks",
      "by-session",
      sessionId,
    );

    return allChunks
      .filter((c) => !c.uploaded)
      .sort((a, b) => a.index - b.index)
      .map((stored) => ({
        data: stored.data,
        index: stored.index,
        timestamp: stored.timestamp,
        duration: stored.duration,
      }));
  }

  async getOrphanedSessions(
    maxAgeTtlMs: number = DEFAULT_ORPHAN_TTL_MS,
  ): Promise<{ sessionId: string; metadata: SessionMetadata }[]> {
    const db = await this.getDB();
    const allSessions = await db.getAll("sessions");
    const now = Date.now();
    const cutoff = now - maxAgeTtlMs;

    const orphaned: { sessionId: string; metadata: SessionMetadata }[] = [];

    for (const session of allSessions) {
      if (session.status !== "active") {
        continue;
      }

      // Skip sessions older than TTL (caller should use cleanupExpiredSessions)
      if (session.metadata.startedAt < cutoff) {
        continue;
      }

      orphaned.push({
        sessionId: session.sessionId,
        metadata: session.metadata,
      });
    }

    return orphaned;
  }

  async cleanupExpiredSessions(
    maxAgeTtlMs: number = DEFAULT_ORPHAN_TTL_MS,
  ): Promise<void> {
    const db = await this.getDB();
    const allSessions = await db.getAll("sessions");
    const now = Date.now();
    const cutoff = now - maxAgeTtlMs;

    for (const session of allSessions) {
      if (session.status !== "active") {
        continue;
      }

      if (session.metadata.startedAt < cutoff) {
        await this.finalizeSession(session.sessionId);
      }
    }
  }

  async finalizeSession(sessionId: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(["sessions", "chunks"], "readwrite");
    const sessionsStore = tx.objectStore("sessions");
    const chunksStore = tx.objectStore("chunks");
    const sessionIndex = chunksStore.index("by-session");

    // Delete all chunks for this session
    let cursor = await sessionIndex.openCursor(sessionId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // Delete the session record
    await sessionsStore.delete(sessionId);

    await tx.done;
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(["sessions", "chunks"], "readwrite");
    await tx.objectStore("sessions").clear();
    await tx.objectStore("chunks").clear();
    await tx.done;
  }
}
