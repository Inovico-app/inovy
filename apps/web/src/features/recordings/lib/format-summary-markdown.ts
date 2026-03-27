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
  if (!text) return "";
  return `## Overview\n\n${text}`;
}

function formatTopics(topics: string[]): string {
  if (topics.length === 0) return "";
  return `## Key Topics\n\n${topics.map((t) => `- ${t}`).join("\n")}`;
}

function formatDecisions(decisions: string[]): string {
  if (decisions.length === 0) return "";
  return `## Decisions\n\n${decisions.map((d) => `- ✅ ${d}`).join("\n")}`;
}

function formatSpeakerContributions(speakers: SpeakerContribution[]): string {
  if (speakers.length === 0) return "";
  const sections = speakers.map(
    (s) =>
      `### ${s.speaker}\n${s.contributions.map((c) => `- ${c}`).join("\n")}`,
  );
  return `## Speaker Contributions\n\n${sections.join("\n\n")}`;
}

function formatImportantQuotes(quotes: ImportantQuote[]): string {
  if (quotes.length === 0) return "";
  const formatted = quotes.map((q) => `> "${q.quote}" — ${q.speaker}`);
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
