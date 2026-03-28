export const KNOWLEDGE_PRIORITY = {
  project: 1,
  organization: 2,
  global: 3,
} as const;

export type KnowledgePriority =
  (typeof KNOWLEDGE_PRIORITY)[keyof typeof KNOWLEDGE_PRIORITY];
