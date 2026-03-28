import type { SummaryContent } from "@/server/cache/summary.cache";

type SpeakerContribution = SummaryContent["speakerContributions"][number];
type ImportantQuote = SummaryContent["importantQuotes"][number];

type BlockType = keyof SummaryContent;

type BlockDataMap = {
  overview: string;
  topics: string[];
  decisions: string[];
  speakerContributions: SpeakerContribution[];
  importantQuotes: ImportantQuote[];
};

function formatOverview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return `## Overview\n\n${trimmed}`;
}

function formatTopics(topics: string[]): string {
  const filtered = topics.filter((t) => t.trim() !== "");
  if (filtered.length === 0) return "";
  return `## Key Topics\n\n${filtered.map((t) => `- ${t}`).join("\n")}`;
}

function formatDecisions(decisions: string[]): string {
  const filtered = decisions.filter((d) => d.trim() !== "");
  if (filtered.length === 0) return "";
  return `## Decisions\n\n${filtered.map((d) => `- ✅ ${d}`).join("\n")}`;
}

function formatSpeakerContributions(speakers: SpeakerContribution[]): string {
  const filtered = speakers
    .map((s) => ({
      ...s,
      contributions: s.contributions.filter((c) => c.trim() !== ""),
    }))
    .filter((s) => s.contributions.length > 0);
  if (filtered.length === 0) return "";
  const sections = filtered.map(
    (s) =>
      `### ${s.speaker}\n${s.contributions.map((c) => `- ${c}`).join("\n")}`,
  );
  return `## Speaker Contributions\n\n${sections.join("\n\n")}`;
}

function formatImportantQuotes(quotes: ImportantQuote[]): string {
  const filtered = quotes.filter((q) => q.quote.trim() !== "");
  if (filtered.length === 0) return "";
  const formatted = filtered.map((q) => `> "${q.quote}" — ${q.speaker}`);
  return `## Important Quotes\n\n${formatted.join("\n\n")}`;
}

export function formatBlockAsMarkdown<T extends BlockType>(
  blockType: T,
  data: BlockDataMap[T],
): string {
  switch (blockType) {
    case "overview":
      return formatOverview(data as string);
    case "topics":
      return formatTopics(data as string[]);
    case "decisions":
      return formatDecisions(data as string[]);
    case "speakerContributions":
      return formatSpeakerContributions(data as SpeakerContribution[]);
    case "importantQuotes":
      return formatImportantQuotes(data as ImportantQuote[]);
    default:
      return "";
  }
}

export function formatFullSummaryAsMarkdown(content: SummaryContent): string {
  const blocks = [
    formatOverview(content.overview),
    formatTopics(content.topics),
    formatDecisions(content.decisions),
    formatSpeakerContributions(content.speakerContributions),
    formatImportantQuotes(content.importantQuotes),
  ].filter(Boolean);

  return blocks.join("\n\n");
}
