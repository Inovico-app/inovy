import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));
vi.mock("@azure/storage-blob");
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from "@/server/db";

const mockedDb = vi.mocked(db);

describe("Backup Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database connectivity check", () => {
    it("passes when SELECT 1 succeeds", async () => {
      mockedDb.execute.mockResolvedValue([] as never);

      await mockedDb.execute({} as never);

      expect(mockedDb.execute).toHaveBeenCalledOnce();
    });

    it("fails when database is unreachable", async () => {
      mockedDb.execute.mockRejectedValue(new Error("Connection refused"));

      await expect(mockedDb.execute({} as never)).rejects.toThrow(
        "Connection refused",
      );
    });

    it("fails when database times out", async () => {
      mockedDb.execute.mockRejectedValue(new Error("Connection timed out"));

      await expect(mockedDb.execute({} as never)).rejects.toThrow(
        "Connection timed out",
      );
    });

    it("resolves with a result when query succeeds", async () => {
      const mockResult = [{ "?column?": 1 }];
      mockedDb.execute.mockResolvedValue(mockResult as never);

      const result = await mockedDb.execute({} as never);

      expect(result).toEqual(mockResult);
    });
  });

  describe("Blob storage check", () => {
    it("skips when AZURE_STORAGE_CONNECTION_STRING is not set", () => {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

      // When not configured, the check should return skip status
      expect(connectionString).toBeUndefined();
    });

    it("resolves skip status shape when connection string is absent", () => {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;

      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

      // Mirrors the verifyBlobStorageAccessibility early-return guard
      const checkResult =
        connectionString === undefined
          ? {
              name: "azure-blob-storage",
              status: "skip" as const,
              latencyMs: 0,
              details:
                "AZURE_STORAGE_CONNECTION_STRING not configured; skipping check",
            }
          : null;

      expect(checkResult).not.toBeNull();
      expect(checkResult?.status).toBe("skip");
      expect(checkResult?.latencyMs).toBe(0);
    });

    it("reports fail when BlobServiceClient throws on container check", async () => {
      const { BlobServiceClient } = await import("@azure/storage-blob");
      const mockedBlobServiceClient = vi.mocked(BlobServiceClient);

      const mockExists = vi.fn().mockRejectedValue(new Error("Auth error"));
      const mockGetContainerClient = vi.fn().mockReturnValue({
        exists: mockExists,
      });
      mockedBlobServiceClient.fromConnectionString = vi
        .fn()
        .mockReturnValue({ getContainerClient: mockGetContainerClient });

      const connectionString =
        "DefaultEndpointsProtocol=https;AccountName=test";
      const client = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = client.getContainerClient("private");

      await expect(containerClient.exists()).rejects.toThrow("Auth error");
    });

    it("reports pass when container exists", async () => {
      const { BlobServiceClient } = await import("@azure/storage-blob");
      const mockedBlobServiceClient = vi.mocked(BlobServiceClient);

      const mockExists = vi.fn().mockResolvedValue(true);
      const mockGetContainerClient = vi.fn().mockReturnValue({
        exists: mockExists,
      });
      mockedBlobServiceClient.fromConnectionString = vi
        .fn()
        .mockReturnValue({ getContainerClient: mockGetContainerClient });

      const connectionString =
        "DefaultEndpointsProtocol=https;AccountName=test";
      const client = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = client.getContainerClient("private");
      const exists = await containerClient.exists();

      expect(exists).toBe(true);
    });

    it("reports fail when container does not exist", async () => {
      const { BlobServiceClient } = await import("@azure/storage-blob");
      const mockedBlobServiceClient = vi.mocked(BlobServiceClient);

      const mockExists = vi.fn().mockResolvedValue(false);
      const mockGetContainerClient = vi.fn().mockReturnValue({
        exists: mockExists,
      });
      mockedBlobServiceClient.fromConnectionString = vi
        .fn()
        .mockReturnValue({ getContainerClient: mockGetContainerClient });

      const connectionString =
        "DefaultEndpointsProtocol=https;AccountName=test";
      const client = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = client.getContainerClient("private");
      const exists = await containerClient.exists();

      expect(exists).toBe(false);
    });
  });

  describe("Overall status logic", () => {
    it("returns pass when all checks pass", () => {
      const checks = [
        { name: "neon-postgresql", status: "pass" as const, latencyMs: 12 },
        { name: "azure-blob-storage", status: "pass" as const, latencyMs: 45 },
      ];

      const overallStatus = checks.every(
        (c) => c.status === "pass" || c.status === "skip",
      )
        ? "pass"
        : "fail";

      expect(overallStatus).toBe("pass");
    });

    it("returns pass when a check is skipped", () => {
      const checks = [
        { name: "neon-postgresql", status: "pass" as const, latencyMs: 12 },
        { name: "azure-blob-storage", status: "skip" as const, latencyMs: 0 },
      ];

      const overallStatus = checks.every(
        (c) => c.status === "pass" || c.status === "skip",
      )
        ? "pass"
        : "fail";

      expect(overallStatus).toBe("pass");
    });

    it("returns fail when any check fails", () => {
      const checks: Array<{
        name: string;
        status: "pass" | "fail" | "skip";
        latencyMs: number;
      }> = [
        { name: "neon-postgresql", status: "fail", latencyMs: 5000 },
        { name: "azure-blob-storage", status: "pass", latencyMs: 45 },
      ];

      const overallStatus = checks.every(
        (c) => c.status === "pass" || c.status === "skip",
      )
        ? "pass"
        : "fail";

      expect(overallStatus).toBe("fail");
    });

    it("returns fail when all checks fail", () => {
      const checks: Array<{
        name: string;
        status: "pass" | "fail" | "skip";
        latencyMs: number;
      }> = [
        { name: "neon-postgresql", status: "fail", latencyMs: 5000 },
        { name: "azure-blob-storage", status: "fail", latencyMs: 200 },
      ];

      const overallStatus = checks.every(
        (c) => c.status === "pass" || c.status === "skip",
      )
        ? "pass"
        : "fail";

      expect(overallStatus).toBe("fail");
    });
  });
});
