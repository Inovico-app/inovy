import {
  vocabularyCategoryEnum,
  type VocabularyCategory,
} from "@/server/db/schema/knowledge-base-entries";

export interface ParsedVocabularyEntry {
  term: string;
  definition: string;
  boost: number | null;
  category: VocabularyCategory;
  context: string | null;
  error?: string;
}

export interface ParseResult {
  entries: ParsedVocabularyEntry[];
  errors: string[];
}

const VALID_CATEGORIES = new Set<string>(vocabularyCategoryEnum);

/**
 * Parse a vocabulary file (CSV or TXT) into structured entries.
 */
export function parseVocabularyFile(
  content: string,
  fileName: string,
): ParseResult {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "csv") {
    return parseCsv(content);
  }

  if (ext === "txt") {
    return parseTxt(content);
  }

  return { entries: [], errors: [`Unsupported file type: .${ext}`] };
}

function parseCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      entries: [],
      errors: ["CSV file must have a header row and at least one data row"],
    };
  }

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const termIdx = header.indexOf("term");
  const defIdx = header.indexOf("definition");
  const boostIdx = header.indexOf("boost");
  const categoryIdx = header.indexOf("category");
  const contextIdx = header.indexOf("context");

  if (termIdx === -1 || defIdx === -1) {
    return {
      entries: [],
      errors: ["CSV header must contain 'term' and 'definition' columns"],
    };
  }

  const entries: ParsedVocabularyEntry[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const term = cols[termIdx]?.trim() ?? "";
    const definition = cols[defIdx]?.trim() ?? "";

    if (!term || !definition) {
      errors.push(`Row ${i + 1}: term and definition are required`);
      entries.push({
        term,
        definition,
        boost: null,
        category: "custom",
        context: null,
        error: "Term and definition are required",
      });
      continue;
    }

    if (term.length > 100) {
      errors.push(`Row ${i + 1}: term exceeds 100 characters`);
      entries.push({
        term,
        definition,
        boost: null,
        category: "custom",
        context: null,
        error: "Term exceeds 100 characters",
      });
      continue;
    }

    if (definition.length > 5000) {
      errors.push(`Row ${i + 1}: definition exceeds 5000 characters`);
      entries.push({
        term,
        definition,
        boost: null,
        category: "custom",
        context: null,
        error: "Definition exceeds 5000 characters",
      });
      continue;
    }

    let boost: number | null = null;
    if (boostIdx !== -1 && cols[boostIdx]?.trim()) {
      const parsed = parseFloat(cols[boostIdx].trim());
      if (isNaN(parsed) || parsed < 0 || parsed > 2) {
        errors.push(`Row ${i + 1}: boost must be a number between 0 and 2`);
        entries.push({
          term,
          definition,
          boost: null,
          category: "custom",
          context: null,
          error: "Boost must be a number between 0 and 2",
        });
        continue;
      }
      boost = parsed;
    }

    let category: VocabularyCategory = "custom";
    if (categoryIdx !== -1 && cols[categoryIdx]?.trim()) {
      const raw = cols[categoryIdx].trim().toLowerCase();
      if (VALID_CATEGORIES.has(raw)) {
        category = raw as VocabularyCategory;
      } else {
        errors.push(`Row ${i + 1}: invalid category "${raw}", using "custom"`);
      }
    }

    const context =
      contextIdx !== -1 && cols[contextIdx]?.trim()
        ? cols[contextIdx].trim()
        : null;

    entries.push({ term, definition, boost, category, context });
  }

  return { entries, errors };
}

function parseTxt(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const entries: ParsedVocabularyEntry[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split("|");
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: expected "term | definition" format`);
      entries.push({
        term: parts[0]?.trim() ?? "",
        definition: "",
        boost: null,
        category: "custom",
        context: null,
        error: 'Expected "term | definition" format',
      });
      continue;
    }

    const term = parts[0].trim();
    const definition = parts.slice(1).join("|").trim();

    if (!term || !definition) {
      errors.push(`Line ${i + 1}: term and definition are required`);
      entries.push({
        term,
        definition,
        boost: null,
        category: "custom",
        context: null,
        error: "Term and definition are required",
      });
      continue;
    }

    if (term.length > 100) {
      errors.push(`Line ${i + 1}: term exceeds 100 characters`);
      entries.push({
        term,
        definition,
        boost: null,
        category: "custom",
        context: null,
        error: "Term exceeds 100 characters",
      });
      continue;
    }

    entries.push({
      term,
      definition,
      boost: null,
      category: "custom",
      context: null,
    });
  }

  return { entries, errors };
}

/**
 * Simple CSV line parser that handles quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}
