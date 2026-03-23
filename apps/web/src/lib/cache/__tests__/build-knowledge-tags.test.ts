import { describe, it, expect } from "vitest";
import { buildKnowledgeTags } from "../cache-policies";

describe("buildKnowledgeTags", () => {
  it("returns global tags for global scope", () => {
    const tags = buildKnowledgeTags("global", null, "org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
  });

  it("returns org + global tags for organization scope", () => {
    const tags = buildKnowledgeTags("organization", "org-123", "org-123");
    expect(tags).toContain("knowledge-entries:org:org-123");
    expect(tags).toContain("knowledge-documents:org:org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
  });

  it("returns team + global tags for team scope", () => {
    const tags = buildKnowledgeTags("team", "team-456", "org-123");
    expect(tags).toContain("knowledge-entries:team:team-456");
    expect(tags).toContain("knowledge-documents:team:team-456");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
  });

  it("returns project + org + global + hierarchy tags for project scope", () => {
    const tags = buildKnowledgeTags("project", "proj-789", "org-123");
    expect(tags).toContain("knowledge-entries:project:proj-789");
    expect(tags).toContain("knowledge-documents:project:proj-789");
    expect(tags).toContain("knowledge-entries:org:org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
    expect(tags).toContain("knowledge-hierarchy:project:proj-789:org:org-123");
  });

  it("falls back to global-only tags when scopeId is null for non-global scope", () => {
    // Must NOT call CacheTags.knowledgeEntries("org", undefined) — that throws.
    // Instead, skip org-scoped tags and return global tags as fallback.
    const tags = buildKnowledgeTags("organization", null, "org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
    expect(tags).not.toContain("knowledge-entries:org:org-123");
  });
});
