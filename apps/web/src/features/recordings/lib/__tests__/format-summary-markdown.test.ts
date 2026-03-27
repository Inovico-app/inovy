import { describe, expect, it } from "vitest";
import {
  formatBlockAsMarkdown,
  formatFullSummaryAsMarkdown,
} from "../format-summary-markdown";

describe("formatBlockAsMarkdown", () => {
  it("formats overview as markdown heading + paragraph", () => {
    const result = formatBlockAsMarkdown("overview", "This is the overview.");
    expect(result).toBe("## Overview\n\nThis is the overview.");
  });

  it("formats topics as markdown heading + bullet list", () => {
    const result = formatBlockAsMarkdown("topics", ["Topic A", "Topic B"]);
    expect(result).toBe("## Key Topics\n\n- Topic A\n- Topic B");
  });

  it("formats decisions as markdown heading + checkmark list", () => {
    const result = formatBlockAsMarkdown("decisions", [
      "Decision 1",
      "Decision 2",
    ]);
    expect(result).toBe("## Decisions\n\n- ✅ Decision 1\n- ✅ Decision 2");
  });

  it("formats speaker contributions with sub-headings", () => {
    const result = formatBlockAsMarkdown("speakerContributions", [
      { speaker: "Alice", contributions: ["Point 1", "Point 2"] },
      { speaker: "Bob", contributions: ["Point 3"] },
    ]);
    expect(result).toBe(
      "## Speaker Contributions\n\n### Alice\n- Point 1\n- Point 2\n\n### Bob\n- Point 3",
    );
  });

  it("formats important quotes as blockquotes with attribution", () => {
    const result = formatBlockAsMarkdown("importantQuotes", [
      { speaker: "Alice", quote: "Great idea", startTime: 120 },
      { speaker: "Bob", quote: "I agree" },
    ]);
    expect(result).toBe(
      '## Important Quotes\n\n> "Great idea" — Alice\n\n> "I agree" — Bob',
    );
  });

  it("returns empty string for empty overview", () => {
    const result = formatBlockAsMarkdown("overview", "");
    expect(result).toBe("");
  });

  it("returns empty string for empty array blocks", () => {
    expect(formatBlockAsMarkdown("topics", [])).toBe("");
    expect(formatBlockAsMarkdown("decisions", [])).toBe("");
    expect(formatBlockAsMarkdown("speakerContributions", [])).toBe("");
    expect(formatBlockAsMarkdown("importantQuotes", [])).toBe("");
  });
});

describe("formatFullSummaryAsMarkdown", () => {
  it("combines all non-empty blocks with double newlines", () => {
    const content = {
      overview: "Meeting overview",
      topics: ["Topic 1"],
      decisions: ["Decision 1"],
      speakerContributions: [{ speaker: "Alice", contributions: ["Did X"] }],
      importantQuotes: [{ speaker: "Alice", quote: "Nice" }],
    };
    const result = formatFullSummaryAsMarkdown(content);
    expect(result).toContain("## Overview\n\nMeeting overview");
    expect(result).toContain("## Key Topics\n\n- Topic 1");
    expect(result).toContain("## Decisions\n\n- ✅ Decision 1");
    expect(result).toContain("## Speaker Contributions\n\n### Alice\n- Did X");
    expect(result).toContain('## Important Quotes\n\n> "Nice" — Alice');
  });

  it("skips empty blocks", () => {
    const content = {
      overview: "Only overview",
      topics: [],
      decisions: [],
      speakerContributions: [],
      importantQuotes: [],
    };
    const result = formatFullSummaryAsMarkdown(content);
    expect(result).toBe("## Overview\n\nOnly overview");
  });

  it("returns empty string when all blocks are empty", () => {
    const content = {
      overview: "",
      topics: [],
      decisions: [],
      speakerContributions: [],
      importantQuotes: [],
    };
    const result = formatFullSummaryAsMarkdown(content);
    expect(result).toBe("");
  });
});
