import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { getCachedAgentSettings } from "@/server/cache/agent-settings.cache";
import { getCachedOrganizationSettings } from "@/server/cache/organization-settings.cache";
import { ChatQueries } from "@/server/data-access/chat.queries";
import type {
  ChatConversation,
  NewChatConversation,
} from "@/server/db/schema/chat-conversations";
import type {
  NewChatMessage,
  SourceReference,
} from "@/server/db/schema/chat-messages";
import { streamText } from "ai";
import { err, ok } from "neverthrow";
import { createGuardedModel } from "../ai/middleware";
import { getCachedProjectTemplate } from "../cache/project-template.cache";
import { AgentMetricsService } from "./agent-metrics.service";
import { connectionPool } from "./connection-pool.service";
import { ConversationContextManager } from "./conversation-context-manager.service";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { ProjectService } from "./project.service";
import { PromptBuilder } from "./prompt-builder.service";
import { RAGService } from "./rag/rag.service";
import type { SearchResult } from "./rag/types";
import { SearchResultFormatter } from "./search-result-formatter.service";

const RAG_CITATION_INSTRUCTION =
  "Each source is prefixed with [N]; use that exact number when citing.";

export class ChatService {
  private static ragService = new RAGService();

  /**
   * Get a short source description for context metadata
   */
  private static getSourceDescription(result: SearchResult): string {
    const title =
      result.metadata.recordingTitle ??
      result.metadata.title ??
      result.metadata.documentTitle ??
      "Unknown";
    const date = result.metadata.recordingDate as string | undefined;

    switch (result.contentType) {
      case "recording":
        return date ? `Recording - ${title} (${date})` : `Recording - ${title}`;
      case "transcription":
        return date
          ? `Transcription - ${title} (${date})`
          : `Transcription - ${title}`;
      case "summary":
        return date ? `Summary - ${title} (${date})` : `Summary - ${title}`;
      case "task":
        return date ? `Task - ${title} (${date})` : `Task - ${title}`;
      case "knowledge_document":
        return `Knowledge Document - ${title}`;
      case "project_template":
        return "Project template";
      case "organization_instructions":
        return "Organization instructions";
      default:
        return String(result.contentType);
    }
  }

  /**
   * Build context string from search results for LLM
   *
   * Each result is prefixed with [N] so the model can cite sources correctly.
   * Results must be pre-limited; pass the same array to formatSourceCitations.
   *
   * @param results - Pre-limited search results (same order as sources array)
   * @returns Formatted context string with numbered source blocks
   */
  private static buildContextFromResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return "No relevant information found in the project.";
    }

    const contextParts: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const sourceNumber = i + 1;
      const description = this.getSourceDescription(result);

      contextParts.push(`[${sourceNumber}] ${description}`);
      contextParts.push(result.contentText);
      contextParts.push(""); // Blank line between sources
    }

    return contextParts.join("\n").trim();
  }

  /**
   * Format search results as source citations
   *
   * @param results - Search results to format
   * @param query - Optional query string for highlighting
   * @param highlightTerms - Whether to highlight query terms (default: false)
   * @returns Formatted source citations array
   */
  private static formatSourceCitations(
    results: SearchResult[],
    query?: string,
    highlightTerms: boolean = false
  ): Array<{
    contentId: string;
    contentType:
      | "recording"
      | "transcription"
      | "summary"
      | "task"
      | "knowledge_document"
      | "project_template"
      | "organization_instructions";
    title: string;
    excerpt: string;
    similarityScore: number;
    recordingId?: string;
    timestamp?: number;
    recordingDate?: string;
    projectName?: string;
    projectId?: string;
    documentId?: string; // For knowledge documents
    documentTitle?: string; // For knowledge documents
  }> {
    return results.map((result) => {
      // Format excerpt with intelligent truncation
      const excerpt = SearchResultFormatter.formatExcerpt(result, {
        maxExcerptChars: 200,
        highlightQueryTerms: highlightTerms,
        query,
      });

      // Handle knowledge documents differently
      if (result.contentType === "knowledge_document") {
        return {
          contentId: result.contentId,
          contentType: result.contentType,
          title:
            (result.metadata.documentTitle as string) ||
            (result.metadata.title as string) ||
            "Knowledge Document",
          excerpt,
          similarityScore: result.similarity,
          documentId: result.metadata.documentId as string,
          documentTitle: result.metadata.documentTitle as string,
        };
      }

      // Handle regular recording sources
      return {
        contentId: result.contentId,
        contentType: result.contentType,
        title:
          result.metadata.title ?? result.metadata.recordingTitle ?? "Untitled",
        excerpt,
        similarityScore: result.similarity,
        // For transcriptions, the contentId IS the recordingId
        recordingId:
          result.metadata.recordingId ??
          (result.contentType === "transcription"
            ? result.contentId
            : undefined),
        timestamp: result.metadata.timestamp,
        recordingDate: result.metadata.recordingDate as string | undefined,
        projectName: result.metadata.projectName as string | undefined,
        projectId: result.metadata.projectId as string | undefined,
      };
    });
  }

  /**
   * Create a new conversation for a project
   */
  static async createConversation(
    projectId: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<{ conversationId: string }>> {
    try {
      const conversation: NewChatConversation = {
        projectId,
        userId,
        organizationId,
        context: "project",
      };

      const result = await ChatQueries.createConversation(conversation);

      logger.info("Created conversation", { conversationId: result.id });
      return ok({ conversationId: result.id });
    } catch (error) {
      logger.error("Error creating conversation", { error, projectId, userId });
      return err(
        ActionErrors.internal(
          "Failed to create conversation",
          error as Error,
          "ChatService.createConversation"
        )
      );
    }
  }

  /**
   * Create a new organization-level conversation
   */
  static async createOrganizationConversation(
    userId: string,
    organizationId: string
  ): Promise<ActionResult<{ conversationId: string }>> {
    try {
      const conversation: NewChatConversation = {
        projectId: null,
        userId,
        organizationId,
        context: "organization",
      };

      const result = await ChatQueries.createConversation(conversation);

      return ok({ conversationId: result.id });
    } catch (error) {
      logger.error("Error creating organization conversation", {
        error,
        organizationId,
        userId,
      });
      return err(
        ActionErrors.internal(
          "Failed to create organization conversation",
          error as Error,
          "ChatService.createOrganizationConversation"
        )
      );
    }
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(conversationId: string) {
    try {
      const messages =
        await ChatQueries.getMessagesByConversationId(conversationId);

      return ok(messages);
    } catch (error) {
      logger.error("Error getting conversation history", {
        error,
        conversationId,
      });
      return err(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Generate chat response using GPT-5-nano with streaming
   */
  static async generateResponse(
    conversationId: string,
    userMessage: string,
    projectId: string,
    organizationId: string
  ) {
    try {
      logger.info("Generating chat response", { conversationId, projectId });

      // Get conversation to verify access
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Verify organization access
      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ChatService.generateResponse"
        );
      } catch {
        throw new Error("Conversation not found");
      }

      // Save user message
      const userMessageEntry: NewChatMessage = {
        conversationId,
        role: "user",
        content: userMessage,
      };
      await ChatQueries.createMessage(userMessageEntry);

      // Get relevant context using RAG search
      const ragContextResult = await this.getRelevantContext(
        userMessage,
        projectId
      );

      let context = "";
      let sources: SourceReference[] = [];

      if (ragContextResult.isOk()) {
        context = ragContextResult.value.context;
        sources = ragContextResult.value.sources.map(
          (source: {
            contentId: string;
            contentType: string;
            title: string;
            excerpt: string;
            similarityScore: number;
            recordingId?: string;
            timestamp?: number;
          }) => ({
            contentId: source.contentId,
            contentType: source.contentType as SourceReference["contentType"],
            title: source.title,
            excerpt: source.excerpt,
            similarityScore: source.similarityScore,
            recordingId: source.recordingId,
            timestamp: source.timestamp,
          })
        );
      }

      // Get conversation context with smart pruning and summarization
      const conversationContextResult =
        await ConversationContextManager.getConversationContext(conversationId);

      if (conversationContextResult.isErr()) {
        logger.error("Failed to get conversation context", {
          component: "ChatService.generateResponse",
          conversationId,
          error: conversationContextResult.error,
        });
        return err(conversationContextResult.error);
      }

      const conversationHistory = conversationContextResult.value.messages;
      const conversationSummary = conversationContextResult.value.summary;

      // Get project and knowledge context for prompt building
      const projectResult = await ProjectService.getProjectById(projectId);
      const project = projectResult.isOk() ? projectResult.value : null;

      let knowledgeContext = "";
      if (project) {
        const knowledgeResult =
          await KnowledgeBaseService.buildKnowledgeContext(
            projectId,
            project.organizationId
          );
        if (knowledgeResult.isOk()) {
          knowledgeContext = knowledgeResult.value;
        }
      }

      // Get project template for RAG context
      const projectTemplate = await getCachedProjectTemplate(projectId);

      // Validate prompt safety (check for injection attempts)
      const safetyCheck = PromptBuilder.Base.validatePromptSafety(
        userMessage,
        projectTemplate
      );
      if (!safetyCheck.safe) {
        logger.warn("Potential prompt injection detected", {
          conversationId,
          issues: safetyCheck.issues,
        });
        // Log but continue - the guard rails in system prompt will handle this
      }

      // Build complete prompt with XML tagging and priority hierarchy
      // Include conversation summary if available
      let ragContextWithSummary = context
        ? `Here is relevant information from the project recordings. ${RAG_CITATION_INSTRUCTION}

${context}

Please answer the user's question based on this information.`
        : "No relevant information was found in the project recordings. Let the user know you don't have specific information to answer their question.";

      if (conversationSummary) {
        ragContextWithSummary += `\n\nPrevious conversation summary:\n${conversationSummary}`;
      }

      const promptResult = PromptBuilder.Chat.buildPrompt({
        projectId,
        organizationId: project?.organizationId ?? null,
        projectName: project?.name,
        projectDescription: project?.description ?? null,
        knowledgeContext,
        ragContent: ragContextWithSummary,
        userQuery: userMessage,
        projectTemplate,
        isOrganizationLevel: false,
      });

      // Stream response from GPT-5-nano with retry logic, request tracking, and guardrails
      let streamError: Error | null = null;

      const result = await connectionPool.executeWithRetry(
        async () =>
          connectionPool.withOpenAIClient(async (openai) => {
            const guardedModel = createGuardedModel(openai("gpt-5-nano"), {
              organizationId,
              userId: conversation.userId,
              conversationId,
              projectId,
              chatContext: "project",
              requestType: "chat",
              pii: { mode: "redact" },
            });

            return streamText({
              model: guardedModel,
              system: promptResult.systemPrompt,
              messages: [
                ...conversationHistory,
                {
                  role: "user",
                  content: promptResult.userPrompt,
                },
              ],
              onError: (error) => {
                streamError =
                  error instanceof Error ? error : new Error(String(error));
                logger.error("Stream error during chat response generation", {
                  component: "ChatService.generateResponse",
                  conversationId,
                  projectId,
                  error: streamError,
                });
              },
            });
          }),
        "openai"
      );

      // Collect the full response with error handling
      let fullResponse = "";
      try {
        for await (const textPart of result.textStream) {
          fullResponse += textPart;
        }
      } catch (error) {
        // Handle errors during stream consumption
        const streamConsumptionError =
          error instanceof Error ? error : new Error(String(error));
        logger.error("Error consuming stream in generateResponse", {
          component: "ChatService.generateResponse",
          conversationId,
          projectId,
          error: streamConsumptionError,
        });

        // If we have partial content, we could still save it, but for now we'll fail
        if (streamError) {
          throw streamError;
        }
        throw streamConsumptionError;
      }

      // Check if stream error occurred
      if (streamError) {
        throw streamError;
      }

      // Save assistant message
      const assistantMessageEntry: NewChatMessage = {
        conversationId,
        role: "assistant",
        content: fullResponse,
        sources,
      };
      await ChatQueries.createMessage(assistantMessageEntry);

      // Update conversation title if it's the first message
      const conversationMessages =
        await ChatQueries.getMessagesByConversationId(conversationId);
      /**
       * At the time of the check, there are always at least 2 messages (user + assistant),
       * so the condition should be === 2 to detect the first exchange and generate an auto-title.
       */
      if (conversationMessages.length === 2 && !conversation.title) {
        // Generate a short title from the first user message
        const title =
          userMessage.length > 50
            ? userMessage.substring(0, 50) + "..."
            : userMessage;
        await ChatQueries.updateConversationTitle(conversationId, title);
      }

      logger.info("Chat response generated", { conversationId });

      return ok({ response: fullResponse, sources });
    } catch (error) {
      logger.error("Error generating chat response", {
        error,
        conversationId,
        projectId,
      });
      return err(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Stream chat response (returns a StreamableValue for use with Vercel AI SDK)
   */
  static async streamResponse(
    conversationId: string,
    userMessage: string,
    projectId: string,
    organizationId: string
  ) {
    try {
      logger.info("Streaming chat response", { conversationId, projectId });

      // Get conversation to verify access
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Verify organization access
      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ChatService.streamResponse"
        );
      } catch {
        throw new Error("Conversation not found");
      }

      // Save user message
      const userMessageEntry: NewChatMessage = {
        conversationId,
        role: "user",
        content: userMessage,
      };
      await ChatQueries.createMessage(userMessageEntry);

      // Get relevant context using RAG search
      const ragContextResult = await this.getRelevantContext(
        userMessage,
        projectId
      );

      let context = "";
      let sources: SourceReference[] = [];

      if (ragContextResult.isOk()) {
        context = ragContextResult.value.context;
        sources = ragContextResult.value.sources.map(
          (source: {
            contentId: string;
            contentType: string;
            title: string;
            excerpt: string;
            similarityScore: number;
            recordingId?: string;
            timestamp?: number;
          }) => ({
            contentId: source.contentId,
            contentType: source.contentType as SourceReference["contentType"],
            title: source.title,
            excerpt: source.excerpt,
            similarityScore: source.similarityScore,
            recordingId: source.recordingId,
            timestamp: source.timestamp,
          })
        );
      }

      // Get conversation context with smart pruning and summarization
      const conversationContextResult =
        await ConversationContextManager.getConversationContext(conversationId);

      if (conversationContextResult.isErr()) {
        logger.error("Failed to get conversation context", {
          component: "ChatService.streamResponse",
          conversationId,
          error: conversationContextResult.error,
        });
        return err(conversationContextResult.error);
      }

      const conversationHistory = conversationContextResult.value.messages;
      const conversationSummary = conversationContextResult.value.summary;

      // Get project and knowledge context for prompt building
      const projectResult = await ProjectService.getProjectById(projectId);
      const project = projectResult.isOk() ? projectResult.value : null;

      let knowledgeContext = "";
      if (project) {
        const knowledgeResult =
          await KnowledgeBaseService.buildKnowledgeContext(
            projectId,
            project.organizationId
          );
        if (knowledgeResult.isOk()) {
          knowledgeContext = knowledgeResult.value;
        }
      }

      // Get project template for RAG context
      const projectTemplate = await getCachedProjectTemplate(projectId);

      // Get organization settings for instructions
      let orgInstructions: string | null = null;
      if (project) {
        const orgSettings = await getCachedOrganizationSettings(
          project.organizationId
        );
        orgInstructions = orgSettings?.instructions ?? null;
      }

      // Get agent settings for configuration
      const agentSettings = await getCachedAgentSettings();

      // Create the full prompt with context
      // Include conversation summary if available
      let ragContextWithSummary = context
        ? `Here is relevant information from the project recordings. ${RAG_CITATION_INSTRUCTION}

${context}

Please answer the user's question based on this information.`
        : "No relevant information was found in the project recordings. Let the user know you don't have specific information to answer their question.";

      if (conversationSummary) {
        ragContextWithSummary += `\n\nPrevious conversation summary:\n${conversationSummary}`;
      }

      // Build complete prompt with priority hierarchy
      const promptResult = PromptBuilder.Chat.buildPrompt({
        projectId,
        organizationId: project?.organizationId ?? null,
        projectName: project?.name,
        projectDescription: project?.description ?? null,
        knowledgeContext,
        ragContent: ragContextWithSummary,
        userQuery: userMessage,
        organizationInstructions: orgInstructions,
        projectTemplate,
        isOrganizationLevel: false,
      });

      // Stream response with error handling, request tracking, and guardrails
      // Note: Streaming endpoints use single-attempt by design to avoid duplicate streamed answers.
      const { client: openai, pooled } =
        connectionPool.getOpenAIClientWithTracking();
      let streamError: Error | null = null;
      let errorMetricTracked = false;

      const startTime = Date.now();
      const userId = conversation.userId;

      const isReasoningModel = agentSettings.model === "gpt-5-nano";

      const guardedModel = createGuardedModel(openai(agentSettings.model), {
        organizationId,
        userId,
        conversationId,
        projectId,
        chatContext: "project",
        requestType: "chat",
        pii: { mode: "redact" },
      });

      const streamTextOptions: Parameters<typeof streamText>[0] = {
        model: guardedModel,
        system: promptResult.systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: promptResult.userPrompt,
          },
        ],
        onError: async (error) => {
          pooled.activeRequests--;
          streamError =
            error instanceof Error ? error : new Error(String(error));

          const latencyMs = Date.now() - startTime;

          await AgentMetricsService.trackRequest({
            organizationId,
            userId,
            conversationId,
            requestType: "chat",
            latencyMs,
            error: true,
            errorMessage: streamError.message,
            query: userMessage,
          });
          errorMetricTracked = true;

          logger.error("Stream error during chat response streaming", {
            component: "ChatService.streamResponse",
            conversationId,
            projectId,
            error: streamError,
          });
        },
        async onFinish({ text, usage, toolCalls }) {
          // Decrement active requests when stream finishes
          pooled.activeRequests--;

          // Calculate latency
          const latencyMs = Date.now() - startTime;

          // Only save if stream completed successfully
          if (streamError) {
            // Track error metric only if not already tracked in onError
            if (!errorMetricTracked) {
              await AgentMetricsService.trackRequest({
                organizationId,
                userId,
                conversationId,
                requestType: "chat",
                latencyMs,
                error: true,
                errorMessage: streamError.message,
                query: userMessage,
              });
            }

            logger.warn("Stream finished with error, not saving message", {
              component: "ChatService.streamResponse",
              conversationId,
              error: streamError,
            });
            return;
          }

          // Extract tool calls if available
          const toolCallNames = toolCalls
            ? toolCalls
                .map((tc) => tc.toolName || tc.toolCallId)
                .filter(Boolean)
            : undefined;

          // Track success metric
          await AgentMetricsService.trackRequest({
            organizationId,
            userId,
            conversationId,
            requestType: "chat",
            latencyMs,
            error: false,
            tokenCount: usage?.totalTokens,
            toolCalls: toolCallNames,
            query: userMessage,
          });

          // Save assistant message after streaming is complete
          const assistantMessageEntry: NewChatMessage = {
            conversationId,
            role: "assistant",
            content: text,
            sources,
          };
          await ChatQueries.createMessage(assistantMessageEntry);

          // Update conversation title if it's the first exchange
          const conversationMessages =
            await ChatQueries.getMessagesByConversationId(conversationId);
          /**
           * At the time of the check, there are always at least 2 messages (user + assistant),
           * so the condition should be === 2 to detect the first exchange and generate an auto-title.
           */
          if (conversationMessages.length === 2 && !conversation.title) {
            const title =
              userMessage.length > 50
                ? userMessage.substring(0, 50) + "..."
                : userMessage;
            await ChatQueries.updateConversationTitle(conversationId, title);
          }

          logger.info("Chat streaming completed", { conversationId });
        },
      };

      // Only include these parameters for non-reasoning models
      if (!isReasoningModel) {
        streamTextOptions.temperature = agentSettings.temperature;
        streamTextOptions.topP = agentSettings.topP;
        streamTextOptions.frequencyPenalty = agentSettings.frequencyPenalty;
        streamTextOptions.presencePenalty = agentSettings.presencePenalty;
      }

      const result = streamText(streamTextOptions);

      // If stream error occurred immediately, decrement and throw
      if (streamError) {
        pooled.activeRequests--;
        throw streamError;
      }

      // Return stream with sources as metadata in the response
      return ok({
        stream: result.toUIMessageStreamResponse({
          messageMetadata: () => ({
            sources,
          }),
        }),
      });
    } catch (error) {
      logger.error("Error streaming chat response", {
        error,
        conversationId,
        projectId,
      });
      return err(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Stream organization-level chat response (returns a StreamableValue for use with Vercel AI SDK)
   */
  static async streamOrganizationResponse(
    conversationId: string,
    userMessage: string,
    organizationId: string
  ) {
    try {
      logger.info("Streaming organization chat response", {
        conversationId,
        organizationId,
      });

      // Get conversation to verify access
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Verify organization access
      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ChatService.streamOrganizationResponse"
        );
      } catch {
        throw new Error("Conversation not found");
      }

      // Verify this is an organization-level conversation
      if (conversation.projectId !== null) {
        throw new Error("This is not an organization-level conversation");
      }

      // Save user message
      const userMessageEntry: NewChatMessage = {
        conversationId,
        role: "user",
        content: userMessage,
      };
      await ChatQueries.createMessage(userMessageEntry);

      // Get relevant context using organization-wide RAG search
      const ragContextResult = await this.getRelevantContextOrganizationWide(
        userMessage,
        organizationId
      );

      let context = "";
      let sources: SourceReference[] = [];

      if (ragContextResult.isOk()) {
        context = ragContextResult.value.context;
        sources = ragContextResult.value.sources.map(
          (source: {
            contentId: string;
            contentType: string;
            title: string;
            excerpt: string;
            similarityScore: number;
            recordingId?: string;
            timestamp?: number;
          }) => ({
            contentId: source.contentId,
            contentType: source.contentType as SourceReference["contentType"],
            title: source.title,
            excerpt: source.excerpt,
            similarityScore: source.similarityScore,
            recordingId: source.recordingId,
            timestamp: source.timestamp,
          })
        );
      }

      // Get conversation context with smart pruning and summarization
      const conversationContextResult =
        await ConversationContextManager.getConversationContext(conversationId);

      if (conversationContextResult.isErr()) {
        logger.error("Failed to get conversation context", {
          component: "ChatService.streamOrganizationResponse",
          conversationId,
          error: conversationContextResult.error,
        });
        return err(conversationContextResult.error);
      }

      const conversationHistory = conversationContextResult.value.messages;
      const conversationSummary = conversationContextResult.value.summary;

      // Get organization settings for instructions
      const orgSettings = await getCachedOrganizationSettings(organizationId);
      const orgInstructions = orgSettings?.instructions ?? null;

      // Get agent settings for configuration
      const agentSettings = await getCachedAgentSettings();

      // Fetch knowledge base context for organization (org + global)
      const knowledgeResult = await KnowledgeBaseService.buildKnowledgeContext(
        null, // No project ID for org-level
        organizationId
      );
      const knowledgeContext = knowledgeResult.isOk()
        ? knowledgeResult.value
        : "";

      // Create the full prompt with context
      // Include conversation summary if available
      let ragContextWithSummary = context
        ? `Here is relevant information from across all organization recordings and projects. ${RAG_CITATION_INSTRUCTION}

${context}

Please answer the user's question based on this information. When referencing information, mention which project it comes from.`
        : "No relevant information was found in the organization's recordings. Let the user know you don't have specific information to answer their question.";

      if (conversationSummary) {
        ragContextWithSummary += `\n\nPrevious conversation summary:\n${conversationSummary}`;
      }

      // Build complete prompt with priority hierarchy
      const promptResult = PromptBuilder.Chat.buildPrompt({
        organizationId,
        knowledgeContext,
        ragContent: ragContextWithSummary,
        userQuery: userMessage,
        organizationInstructions: orgInstructions,
        projectTemplate: null, // No project template for org-level chat
        isOrganizationLevel: true,
      });

      // Stream response with error handling, request tracking, and guardrails
      // Note: Streaming endpoints use single-attempt by design to avoid duplicate streamed answers.
      const { client: openai, pooled } =
        connectionPool.getOpenAIClientWithTracking();
      let streamError: Error | null = null;

      const startTime = Date.now();
      const userId = conversation.userId;

      const isReasoningModel = agentSettings.model === "gpt-5-nano";

      const guardedModel = createGuardedModel(openai(agentSettings.model), {
        organizationId,
        userId,
        conversationId,
        chatContext: "organization",
        requestType: "chat",
        pii: { mode: "redact" },
      });

      const streamTextOptions: Parameters<typeof streamText>[0] = {
        model: guardedModel,
        system: promptResult.systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: promptResult.userPrompt,
          },
        ],
        onError: async (error) => {
          pooled.activeRequests--;
          streamError =
            error instanceof Error ? error : new Error(String(error));

          const latencyMs = Date.now() - startTime;

          await AgentMetricsService.trackRequest({
            organizationId,
            userId,
            conversationId,
            requestType: "chat",
            latencyMs,
            error: true,
            errorMessage: streamError.message,
            query: userMessage,
          });

          logger.error(
            "Stream error during organization chat response streaming",
            {
              component: "ChatService.streamOrganizationResponse",
              conversationId,
              organizationId,
              error: streamError,
            }
          );
        },
        async onFinish({ text, usage, toolCalls }) {
          // Decrement active requests when stream finishes
          pooled.activeRequests--;

          // Calculate latency
          const latencyMs = Date.now() - startTime;

          // Only save if stream completed successfully
          if (streamError) {
            // Track error metric
            await AgentMetricsService.trackRequest({
              organizationId,
              userId,
              conversationId,
              requestType: "chat",
              latencyMs,
              error: true,
              errorMessage: streamError.message,
              query: userMessage,
            });

            logger.warn("Stream finished with error, not saving message", {
              component: "ChatService.streamOrganizationResponse",
              conversationId,
              error: streamError,
            });
            return;
          }

          // Extract tool calls if available
          const toolCallNames = toolCalls
            ? toolCalls
                .map((tc) => tc.toolName || tc.toolCallId)
                .filter(Boolean)
            : undefined;

          // Track success metric
          await AgentMetricsService.trackRequest({
            organizationId,
            userId,
            conversationId,
            requestType: "chat",
            latencyMs,
            error: false,
            tokenCount: usage?.totalTokens,
            toolCalls: toolCallNames,
            query: userMessage,
          });

          // Save assistant message after streaming is complete
          const assistantMessageEntry: NewChatMessage = {
            conversationId,
            role: "assistant",
            content: text,
            sources,
          };
          await ChatQueries.createMessage(assistantMessageEntry);

          // Update conversation title if it's the first exchange
          const conversationMessages =
            await ChatQueries.getMessagesByConversationId(conversationId);
          if (conversationMessages.length === 2 && !conversation.title) {
            const title =
              userMessage.length > 50
                ? userMessage.substring(0, 50) + "..."
                : userMessage;
            await ChatQueries.updateConversationTitle(conversationId, title);
          }

          logger.info("Organization chat streaming completed", {
            conversationId,
          });
        },
      };

      // Only include these parameters for non-reasoning models
      if (!isReasoningModel) {
        streamTextOptions.temperature = agentSettings.temperature;
        streamTextOptions.topP = agentSettings.topP;
        streamTextOptions.frequencyPenalty = agentSettings.frequencyPenalty;
        streamTextOptions.presencePenalty = agentSettings.presencePenalty;
      }

      const result = streamText(streamTextOptions);

      // If stream error occurred immediately, decrement and throw
      if (streamError) {
        pooled.activeRequests--;
        throw streamError;
      }

      // Return stream with sources as metadata in the response
      return ok({
        stream: result.toUIMessageStreamResponse({
          messageMetadata: () => ({
            sources,
          }),
        }),
      });
    } catch (error) {
      logger.error("Error streaming organization chat response", {
        error,
        conversationId,
        organizationId,
      });
      return err(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Delete conversation
   */
  static async deleteConversation(
    conversationId: string
  ): Promise<ActionResult<void>> {
    try {
      await ChatQueries.deleteConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error deleting conversation", { error, conversationId });
      return err(
        ActionErrors.internal(
          "Failed to delete conversation",
          error as Error,
          "ChatService.deleteConversation"
        )
      );
    }
  }

  /**
   * List conversations with pagination
   */
  static async listConversations(params: {
    userId: string;
    organizationId?: string;
    projectId?: string;
    context?: "project" | "organization";
    filter?: "all" | "active" | "archived" | "deleted";
    page?: number;
    limit?: number;
  }): Promise<
    ActionResult<{
      conversations: (ChatConversation & { lastMessage?: string | null })[];
      total: number;
    }>
  > {
    try {
      const result = await ChatQueries.getConversationsWithPagination(params);
      return ok(result);
    } catch (error) {
      logger.error("Error listing conversations", { error, params });
      return err(
        ActionErrors.internal(
          "Failed to list conversations",
          error as Error,
          "ChatService.listConversations"
        )
      );
    }
  }

  /**
   * Search conversations
   */
  static async searchConversations(params: {
    userId: string;
    query: string;
    organizationId?: string;
    projectId?: string;
    context?: "project" | "organization";
    limit?: number;
  }): Promise<
    ActionResult<(ChatConversation & { lastMessage?: string | null })[]>
  > {
    try {
      const conversations = await ChatQueries.searchConversations(params);
      return ok(conversations);
    } catch (error) {
      logger.error("Error searching conversations", { error, params });
      return err(
        ActionErrors.internal(
          "Failed to search conversations",
          error as Error,
          "ChatService.searchConversations"
        )
      );
    }
  }

  /**
   * Soft delete conversation
   */
  static async softDeleteConversation(
    conversationId: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.softDeleteConversation"
          )
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to delete this conversation",
            { conversationId },
            "ChatService.softDeleteConversation"
          )
        );
      }

      // Verify organization access
      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ChatService.softDeleteConversation"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.softDeleteConversation"
          )
        );
      }

      await ChatQueries.softDeleteConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error soft deleting conversation", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to soft delete conversation",
          error as Error,
          "ChatService.softDeleteConversation"
        )
      );
    }
  }

  /**
   * Restore conversation
   */
  static async restoreConversation(
    conversationId: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<boolean>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.restoreConversation"
          )
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to restore this conversation",
            { conversationId },
            "ChatService.restoreConversation"
          )
        );
      }

      // Verify organization access
      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ChatService.restoreConversation"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.restoreConversation"
          )
        );
      }

      const restored = await ChatQueries.restoreConversation(conversationId);
      return ok(restored);
    } catch (error) {
      logger.error("Error restoring conversation", { error, conversationId });
      return err(
        ActionErrors.internal(
          "Failed to restore conversation",
          error as Error,
          "ChatService.restoreConversation"
        )
      );
    }
  }

  /**
   * Archive conversation
   */
  static async archiveConversation(
    conversationId: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.archiveConversation"
          )
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to archive this conversation",
            { conversationId },
            "ChatService.archiveConversation"
          )
        );
      }

      // Verify organization access
      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ChatService.archiveConversation"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.archiveConversation"
          )
        );
      }

      await ChatQueries.archiveConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error archiving conversation", { error, conversationId });
      return err(
        ActionErrors.internal(
          "Failed to archive conversation",
          error as Error,
          "ChatService.archiveConversation"
        )
      );
    }
  }

  /**
   * Unarchive conversation
   */
  static async unarchiveConversation(
    conversationId: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.unarchiveConversation"
          )
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to unarchive this conversation",
            { conversationId },
            "ChatService.unarchiveConversation"
          )
        );
      }

      // Verify organization access
      try {
        assertOrganizationAccess(
          conversation.organizationId,
          organizationId,
          "ChatService.unarchiveConversation"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.unarchiveConversation"
          )
        );
      }

      await ChatQueries.unarchiveConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error unarchiving conversation", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to unarchive conversation",
          error as Error,
          "ChatService.unarchiveConversation"
        )
      );
    }
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(
    userId: string,
    organizationId?: string
  ): Promise<
    ActionResult<{
      active: number;
      archived: number;
      deleted: number;
      total: number;
    }>
  > {
    try {
      const stats = await ChatQueries.getConversationStats(
        userId,
        organizationId
      );
      return ok(stats);
    } catch (error) {
      logger.error("Error getting conversation stats", { error, userId });
      return err(
        ActionErrors.internal(
          "Failed to get conversation statistics",
          error as Error,
          "ChatService.getConversationStats"
        )
      );
    }
  }

  /**
   * Export conversation as text
   */
  static async exportConversationAsText(
    conversationId: string,
    userId: string
  ): Promise<ActionResult<string>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.exportConversationAsText"
          )
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to export this conversation",
            { conversationId },
            "ChatService.exportConversationAsText"
          )
        );
      }

      const messages =
        await ChatQueries.getMessagesByConversationId(conversationId);

      const { formatConversationAsText } = await import("@/lib/export-utils");
      const text = formatConversationAsText(conversation, messages);

      return ok(text);
    } catch (error) {
      logger.error("Error exporting conversation as text", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to export conversation as text",
          error as Error,
          "ChatService.exportConversationAsText"
        )
      );
    }
  }

  /**
   * Export conversation as PDF
   */
  static async exportConversationAsPDF(
    conversationId: string,
    userId: string
  ): Promise<ActionResult<Blob>> {
    try {
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        return err(
          ActionErrors.notFound(
            "Conversation",
            "ChatService.exportConversationAsPDF"
          )
        );
      }
      if (conversation.userId !== userId) {
        return err(
          ActionErrors.forbidden(
            "Unauthorized to export this conversation",
            { conversationId },
            "ChatService.exportConversationAsPDF"
          )
        );
      }

      const messages =
        await ChatQueries.getMessagesByConversationId(conversationId);

      const { generateConversationPDF } = await import("@/lib/export-utils");
      const pdf = await generateConversationPDF(conversation, messages);

      return ok(pdf);
    } catch (error) {
      logger.error("Error exporting conversation as PDF", {
        error,
        conversationId,
      });
      return err(
        ActionErrors.internal(
          "Failed to export conversation as PDF",
          error as Error,
          "ChatService.exportConversationAsPDF"
        )
      );
    }
  }

  /**
   * Get relevant context for a user query (project-level)
   */
  private static async getRelevantContext(
    query: string,
    projectId: string
  ): Promise<
    ActionResult<{
      context: string;
      sources: Array<{
        contentId: string;
        contentType:
          | "recording"
          | "transcription"
          | "summary"
          | "task"
          | "knowledge_document"
          | "project_template"
          | "organization_instructions";
        title: string;
        excerpt: string;
        similarityScore: number;
        recordingId?: string;
        timestamp?: number;
        recordingDate?: string;
        projectName?: string;
        projectId?: string;
        documentTitle?: string;
      }>;
    }>
  > {
    try {
      const searchResult = await this.ragService.search(query, "", {
        projectId,
        limit: 8,
        scoreThreshold: 0.6, // Higher threshold for better relevance
        useHybrid: false,
        useReranking: true, // Enable re-ranking for LLM context
      });

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const results = searchResult.value;
      const limitedResults = SearchResultFormatter.limitResultsByTokens(
        results,
        4000
      );
      const context = this.buildContextFromResults(limitedResults);
      const sources = this.formatSourceCitations(limitedResults, query, false);

      return ok({ context, sources });
    } catch (error) {
      logger.error("Error getting relevant context", {
        error,
        query,
        projectId,
      });
      return err(
        ActionErrors.internal(
          "Error getting relevant context",
          error as Error,
          "ChatService.getRelevantContext"
        )
      );
    }
  }

  /**
   * Get relevant context for a user query (organization-wide)
   */
  private static async getRelevantContextOrganizationWide(
    query: string,
    organizationId: string
  ): Promise<
    ActionResult<{
      context: string;
      sources: Array<{
        contentId: string;
        contentType:
          | "recording"
          | "transcription"
          | "summary"
          | "task"
          | "knowledge_document"
          | "project_template"
          | "organization_instructions";
        title: string;
        excerpt: string;
        similarityScore: number;
        recordingId?: string;
        timestamp?: number;
        recordingDate?: string;
        projectName?: string;
        projectId?: string;
        documentTitle?: string;
      }>;
    }>
  > {
    try {
      const searchResult = await this.ragService.search(query, "", {
        organizationId,
        limit: 12, // Get more results for org-wide search
        scoreThreshold: 0.6, // Higher threshold for better relevance
        useHybrid: false,
        useReranking: true, // Enable re-ranking for LLM context
      });

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const results = searchResult.value;
      const limitedResults = SearchResultFormatter.limitResultsByTokens(
        results,
        4000
      );
      const context = this.buildContextFromResults(limitedResults);
      const sources = this.formatSourceCitations(
        limitedResults,
        query,
        false
      ).map((source) => ({
        ...source,
        projectId: limitedResults.find((r) => r.contentId === source.contentId)
          ?.metadata.projectId as string | undefined,
      }));

      return ok({ context, sources });
    } catch (error) {
      logger.error("Error getting organization-wide relevant context", {
        error,
        query,
        organizationId,
      });
      return err(
        ActionErrors.internal(
          "Error getting organization-wide relevant context",
          error as Error,
          "ChatService.getRelevantContextOrganizationWide"
        )
      );
    }
  }
}

