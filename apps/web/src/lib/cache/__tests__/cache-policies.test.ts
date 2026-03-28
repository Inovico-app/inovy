import { describe, it, expect } from "vitest";
import { CACHE_POLICIES } from "../cache-policies";
import type { InvalidationContext } from "../types";

function makeCtx(
  overrides: Partial<InvalidationContext> = {},
): InvalidationContext {
  return {
    userId: "user-1",
    organizationId: "org-1",
    userTeamIds: ["team-1"],
    input: {},
    result: undefined,
    ...overrides,
  };
}

describe("CACHE_POLICIES", () => {
  it("project:create returns org-level project tags", () => {
    const tags = CACHE_POLICIES["project:create"]!(makeCtx());
    expect(tags).toContain("projects:org:org-1");
    expect(tags).toContain("project-count:org:org-1");
    expect(tags).toContain("dashboard:stats:org-1");
    expect(tags).toContain("dashboard:recent-projects:org-1");
  });

  it("project:update returns project-specific + org-level tags", () => {
    const tags = CACHE_POLICIES["project:update"]!(
      makeCtx({ input: { projectId: "proj-1" } }),
    );
    expect(tags).toContain("project:proj-1");
    expect(tags).toContain("project-template:proj-1");
    expect(tags).toContain("projects:org:org-1");
  });

  it("recording:update returns recording + transcription history + project + org tags", () => {
    const tags = CACHE_POLICIES["recording:update"]!(
      makeCtx({ input: { recordingId: "rec-1", projectId: "proj-1" } }),
    );
    expect(tags).toContain("recording:rec-1");
    expect(tags).toContain("transcription-history:rec-1");
    expect(tags).toContain("recordings:project:proj-1");
    expect(tags).toContain("recordings:org:org-1");
    expect(tags).toContain("dashboard:stats:org-1");
  });

  it("recording:restore returns recording + transcription history + org tags", () => {
    const tags = CACHE_POLICIES["recording:restore"]!(
      makeCtx({ input: { recordingId: "rec-1" } }),
    );
    expect(tags).toContain("recording:rec-1");
    expect(tags).toContain("transcription-history:rec-1");
    expect(tags).toContain("recordings:org:org-1");
  });

  it("knowledge_base:create delegates to buildKnowledgeTags", () => {
    const tags = CACHE_POLICIES["knowledge_base:create"]!(
      makeCtx({ input: { scope: "project", scopeId: "proj-1" } }),
    );
    expect(tags).toContain("knowledge-entries:project:proj-1");
    expect(tags).toContain("knowledge-entries:global");
  });

  it("bot_session:delete returns session + org sessions + notifications", () => {
    const tags = CACHE_POLICIES["bot_session:delete"]!(
      makeCtx({ input: { sessionId: "sess-1" } }),
    );
    expect(tags).toContain("bot-session:sess-1");
    expect(tags).toContain("bot-sessions:org:org-1");
    expect(tags).toContain("notifications:user:user-1:org:org-1");
  });
});
