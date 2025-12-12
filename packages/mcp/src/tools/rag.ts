import { RAGService } from "@/server/services/rag/rag.service";
import * as z from "zod/v4";
import { type ToolDefinition } from "../utils/register-tool";

const ragSearchInputSchema = {
  query: z.string().describe("The query to search the knowledge base for"),
  userId: z
    .string()
    .optional()
    .describe("The user ID to search the knowledge base for"),
  options: z.object({
    limit: z
      .number()
      .int()
      .positive()
      .max(50)
      .default(5)
      .optional()
      .describe("The number of results to return (default: 5)"),
    useHybrid: z
      .boolean()
      .default(true)
      .describe("Use hybrid search (vector + keyword)"),
    useReranking: z
      .boolean()
      .default(true)
      .describe("Use cross-encoder re-ranking for improved relevance"),
    filters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional metadata filters"),
    vectorWeight: z
      .number()
      .default(0.7)
      .describe("The weight of the vector search (default: 0.7)"),
    keywordWeight: z
      .number()
      .default(0.3)
      .describe("The weight of the keyword search (default: 0.3)"),
    scoreThreshold: z
      .number()
      .default(0.5)
      .describe("The score threshold for the search (default: 0.5)"),
    organizationId: z
      .string()
      .optional()
      .describe("The organization ID to search the knowledge base for"),
    projectId: z
      .uuid()
      .optional()
      .describe("The project ID to search the knowledge base for"),
  }),
};

export const searchKnowledgeBaseToolDefinition: ToolDefinition<
  typeof ragSearchInputSchema
> = {
  name: "search_knowledge_base",
  config: {
    title: "Search the knowledge base",
    description: "Search the knowledge base for relevant information",
    inputSchema: ragSearchInputSchema,
  },
  handler: async ({ query, userId = "", options = {} }) => {
    const searchResult = await new RAGService().search(query, userId, options);
    if (searchResult.isErr()) {
      throw new Error(searchResult.error.message);
    }
    return {
      content: searchResult.value.map((result: { contentText: string }) => ({
        type: "text" as const,
        text: result.contentText,
      })),
    };
  },
};

