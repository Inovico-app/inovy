import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/data-access/audit-logs.queries");
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/rbac/organization-isolation", () => ({
  validateOrganizationContext: vi.fn().mockResolvedValue({
    isErr: () => false,
    value: { organizationId: "org-1" },
  }),
  assertOrganizationAccess: vi.fn(),
}));

import { AuditLogService, computeHash } from "../audit-log.service";
import { AuditLogsQueries } from "@/server/data-access/audit-logs.queries";

const mockedQueries = vi.mocked(AuditLogsQueries);

function makeAuditLogEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    eventType: "test.event",
    resourceType: "recording" as const,
    resourceId: "rec-1",
    userId: "user-1",
    organizationId: "org-1",
    action: "create" as const,
    category: "mutation" as const,
    ipAddress: null,
    userAgent: null,
    metadata: null,
    previousHash: null,
    hash: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("Audit Log Hash Chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeHash", () => {
    it("produces a deterministic SHA256 hash", () => {
      const entry = makeAuditLogEntry();
      const hash1 = computeHash(entry);
      const hash2 = computeHash(entry);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different hashes for different entries", () => {
      const entry1 = makeAuditLogEntry({ userId: "user-1" });
      const entry2 = makeAuditLogEntry({ userId: "user-2" });
      expect(computeHash(entry1)).not.toBe(computeHash(entry2));
    });
  });

  describe("createAuditLog — hash chain linking", () => {
    it("sets previousHash to genesis for the first entry in an org", async () => {
      // insertWithChain resolves previousHash internally — simulate genesis case
      mockedQueries.insertWithChain.mockImplementation(async (entry) => ({
        ...makeAuditLogEntry(),
        ...entry,
        id: "new-log-1",
        previousHash: "genesis",
      }));

      const result = await AuditLogService.createAuditLog({
        eventType: "test.event",
        resourceType: "recording",
        resourceId: "rec-1",
        userId: "user-1",
        organizationId: "org-1",
        action: "create",
        category: "mutation",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.previousHash).toBe("genesis");
      }
      expect(mockedQueries.insertWithChain).toHaveBeenCalledOnce();
    });

    it("chains previousHash to the last entry hash", async () => {
      // insertWithChain resolves previousHash internally — simulate chaining
      mockedQueries.insertWithChain.mockImplementation(async (entry) => ({
        ...makeAuditLogEntry(),
        ...entry,
        id: "new-log-2",
        previousHash: "abc123def456",
      }));

      const result = await AuditLogService.createAuditLog({
        eventType: "test.event",
        resourceType: "recording",
        resourceId: "rec-2",
        userId: "user-1",
        organizationId: "org-1",
        action: "create",
        category: "mutation",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.previousHash).toBe("abc123def456");
      }
      expect(mockedQueries.insertWithChain).toHaveBeenCalledOnce();
    });

    it("passes createdAt to insertWithChain (hash computed inside transaction)", async () => {
      mockedQueries.insertWithChain.mockImplementation(async (entry) => ({
        ...makeAuditLogEntry(),
        ...entry,
        id: "new-log-3",
        previousHash: "genesis",
        hash: "computed-inside-transaction",
      }));

      const result = await AuditLogService.createAuditLog({
        eventType: "test.event",
        resourceType: "recording",
        resourceId: "rec-3",
        userId: "user-1",
        organizationId: "org-1",
        action: "create",
        category: "mutation",
      });

      const call = mockedQueries.insertWithChain.mock.calls[0]?.[0];
      expect(call?.createdAt).toBeInstanceOf(Date);
      // hash is no longer passed by caller — computed inside insertWithChain transaction
      expect(result.isOk()).toBe(true);
    });
  });
});
