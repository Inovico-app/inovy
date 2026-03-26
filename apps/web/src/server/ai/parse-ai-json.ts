/**
 * Safely parse JSON from AI model responses.
 *
 * LLMs frequently wrap JSON output in markdown code fences (```json ... ```)
 * even when instructed not to. This utility strips those fences before parsing.
 */
export function parseAIJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}
