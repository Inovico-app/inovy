import type { HierarchicalKnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import { KnowledgeModule } from "../index";

// ============================================================================
// Mock functions
// ============================================================================

const mockGetHierarchicalEntries = vi.fn();

vi.mock("@/server/data-access/knowledge-base-entries.queries", () => ({
  KnowledgeBaseEntriesQueries: {
    getHierarchicalEntries: (...args: unknown[]) =>
      mockGetHierarchicalEntries(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================================================
// Test helpers
// ============================================================================

function makeEntry(
  overrides: Partial<HierarchicalKnowledgeEntryDto> = {},
): HierarchicalKnowledgeEntryDto {
  return {
    id: "entry-1",
    scope: "project",
    scopeId: "proj-1",
    term: "API",
    definition: "Application Programming Interface",
    context: null,
    examples: null,
    isActive: true,
    createdById: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    priority: 1,
    ...overrides,
  };
}

// ============================================================================
// Tests: KnowledgeModule.getKnowledge()
// ============================================================================

describe("KnowledgeModule.getKnowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns glossary and entries for valid scope", async () => {
    const entries: HierarchicalKnowledgeEntryDto[] = [
      makeEntry({
        term: "API",
        definition: "Application Programming Interface",
        priority: 2,
      }),
      makeEntry({
        id: "entry-2",
        term: "SDK",
        definition: "Software Development Kit",
        priority: 3,
      }),
    ];

    mockGetHierarchicalEntries.mockResolvedValue(entries);

    const result = await KnowledgeModule.getKnowledge({
      projectId: "proj-1",
      organizationId: "org-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.entries).toHaveLength(2);
      expect(result.value.glossary).toContain(
        "API: Application Programming Interface",
      );
      expect(result.value.glossary).toContain("SDK: Software Development Kit");
    }

    expect(mockGetHierarchicalEntries).toHaveBeenCalledWith(
      "proj-1",
      "org-1",
      undefined,
    );
  });

  it("forwards teamId to getHierarchicalEntries", async () => {
    mockGetHierarchicalEntries.mockResolvedValue([]);

    await KnowledgeModule.getKnowledge({
      projectId: "proj-1",
      organizationId: "org-1",
      teamId: "team-1",
    });

    expect(mockGetHierarchicalEntries).toHaveBeenCalledWith(
      "proj-1",
      "org-1",
      "team-1",
    );
  });

  it("returns empty glossary when no entries", async () => {
    mockGetHierarchicalEntries.mockResolvedValue([]);

    const result = await KnowledgeModule.getKnowledge({
      projectId: null,
      organizationId: "org-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.glossary).toBe("");
      expect(result.value.entries).toEqual([]);
    }
  });

  it("formats glossary correctly with context and examples", async () => {
    const entries: HierarchicalKnowledgeEntryDto[] = [
      makeEntry({
        term: "API",
        definition: "Application Programming Interface",
        context: "Used in web development",
        examples: ["REST API", "GraphQL API"],
        priority: 1,
      }),
    ];

    mockGetHierarchicalEntries.mockResolvedValue(entries);

    const result = await KnowledgeModule.getKnowledge({
      projectId: "proj-1",
      organizationId: "org-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.glossary).toBe(
        "API: Application Programming Interface (Context: Used in web development) (Examples: REST API, GraphQL API)",
      );
    }
  });

  it("strips priority field from entries", async () => {
    const entries: HierarchicalKnowledgeEntryDto[] = [
      makeEntry({ priority: 1 }),
      makeEntry({
        id: "entry-2",
        term: "SDK",
        definition: "Software Development Kit",
        priority: 3,
      }),
    ];

    mockGetHierarchicalEntries.mockResolvedValue(entries);

    const result = await KnowledgeModule.getKnowledge({
      projectId: "proj-1",
      organizationId: "org-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      for (const entry of result.value.entries) {
        expect(entry).not.toHaveProperty("priority");
      }
      // Verify other fields are still present
      expect(result.value.entries[0]).toHaveProperty("id");
      expect(result.value.entries[0]).toHaveProperty("term");
      expect(result.value.entries[0]).toHaveProperty("definition");
      expect(result.value.entries[0]).toHaveProperty("scope");
    }
  });
});
