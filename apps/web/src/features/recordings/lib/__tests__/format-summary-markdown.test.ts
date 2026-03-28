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

  it("returns empty string for whitespace-only overview", () => {
    const result = formatBlockAsMarkdown("overview", "   ");
    expect(result).toBe("");
  });

  it("returns empty string for empty array blocks", () => {
    expect(formatBlockAsMarkdown("topics", [])).toBe("");
    expect(formatBlockAsMarkdown("decisions", [])).toBe("");
    expect(formatBlockAsMarkdown("speakerContributions", [])).toBe("");
    expect(formatBlockAsMarkdown("importantQuotes", [])).toBe("");
  });

  it("filters out whitespace-only entries from topics", () => {
    const result = formatBlockAsMarkdown("topics", ["  ", "Topic A", ""]);
    expect(result).toBe("## Key Topics\n\n- Topic A");
  });

  it("filters out whitespace-only entries from decisions", () => {
    const result = formatBlockAsMarkdown("decisions", ["", "Decision 1", "  "]);
    expect(result).toBe("## Decisions\n\n- ✅ Decision 1");
  });

  it("filters out speakers with only whitespace contributions", () => {
    const result = formatBlockAsMarkdown("speakerContributions", [
      { speaker: "Alice", contributions: ["  ", ""] },
      { speaker: "Bob", contributions: ["Valid point"] },
    ]);
    expect(result).toBe("## Speaker Contributions\n\n### Bob\n- Valid point");
  });

  it("filters out quotes with whitespace-only text", () => {
    const result = formatBlockAsMarkdown("importantQuotes", [
      { speaker: "Alice", quote: "  " },
      { speaker: "Bob", quote: "Good point" },
    ]);
    expect(result).toBe('## Important Quotes\n\n> "Good point" — Bob');
  });

  it("returns empty string when all entries are whitespace", () => {
    expect(formatBlockAsMarkdown("topics", ["  ", "", "\t"])).toBe("");
    expect(formatBlockAsMarkdown("decisions", [" "])).toBe("");
    expect(
      formatBlockAsMarkdown("speakerContributions", [
        { speaker: "Alice", contributions: ["  "] },
      ]),
    ).toBe("");
    expect(
      formatBlockAsMarkdown("importantQuotes", [
        { speaker: "Alice", quote: "  " },
      ]),
    ).toBe("");
  });
});

describe("formatFullSummaryAsMarkdown", () => {
  it("combines all non-empty blocks with double newlines in order", () => {
    const content = {
      overview: "Meeting overview",
      topics: ["Topic 1"],
      decisions: ["Decision 1"],
      speakerContributions: [{ speaker: "Alice", contributions: ["Did X"] }],
      importantQuotes: [{ speaker: "Alice", quote: "Nice" }],
    };
    const result = formatFullSummaryAsMarkdown(content);
    const expected = [
      "## Overview\n\nMeeting overview",
      "## Key Topics\n\n- Topic 1",
      "## Decisions\n\n- ✅ Decision 1",
      "## Speaker Contributions\n\n### Alice\n- Did X",
      '## Important Quotes\n\n> "Nice" — Alice',
    ].join("\n\n");
    expect(result).toBe(expected);
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
