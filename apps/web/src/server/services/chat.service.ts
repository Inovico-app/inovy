import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import { getCachedOrganizationSettings } from "@/server/cache";
import { ChatQueries } from "@/server/data-access/chat.queries";
import {
  type ChatConversation,
  type NewChatConversation,
  type NewChatMessage,
  type SourceReference,
} from "@/server/db/schema";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { err, ok } from "neverthrow";
import { getCachedProjectTemplate } from "../cache/project-template.cache";
import { ProjectService } from "./project.service";
import {
  buildCompletePrompt,
  buildSystemPromptWithGuardRails,
  validatePromptSafety,
} from "./prompt-builder.service";
import { VectorSearchService } from "./vector-search.service";

export class ChatService {
  private static openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
  });

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
      const messages = await ChatQueries.getMessagesByConversationId(
        conversationId
      );

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
   * Build system prompt with project context
   */
  private static async buildSystemPrompt(projectId: string): Promise<string> {
    const projectResult = await ProjectService.getProjectById(projectId);

    if (projectResult.isErr()) {
      return "You are an AI assistant helping users find information in their project recordings.";
    }

    const project = projectResult.value;

    return `You are an AI assistant helping users find information in their project recordings and meetings.

Project: ${project.name}
${project.description ? `Description: ${project.description}` : ""}

Your role:
- Answer questions based on the provided context from project recordings, transcriptions, summaries, and tasks
- When referencing information from sources, include inline citation numbers like [1], [2], etc. that correspond to the source documents provided
- Cite sources by mentioning the recording title and date when referencing specific information
- Be concise and accurate in your responses
- If information is not found in the context, clearly state that you don't have that information in the available recordings
- Use Dutch language when the user asks questions in Dutch, otherwise use English

Citation Guidelines:
- Use numbered citations [1], [2], [3] etc. immediately after statements that reference source material
- The citation numbers correspond to the order of sources provided in the context
- Multiple citations can be used like [1][2] if information comes from multiple sources
- Always cite your sources to help users verify information

General Guidelines:
- Focus on factual information from the recordings
- When discussing tasks, mention their priority and status
- Provide timestamps when available for transcription references
- If asked about specific topics across multiple recordings, synthesize the information clearly`;
  }

  /**
   * Build system prompt for organization-level context
   */
  private static buildOrganizationSystemPrompt(): string {
    return `You are an AI assistant helping users find information across all their organization's recordings and meetings.

Your role:
- Answer questions based on the provided context from all organization recordings, transcriptions, summaries, and tasks
- Follow organization-wide instructions provided in the prompt - these have HIGHEST priority and apply to ALL queries
- When referencing information from sources, include inline citation numbers like [1], [2], etc. that correspond to the source documents provided
- Cite sources by mentioning the project name, recording title, and date when referencing specific information
- Be concise and accurate in your responses
- When discussing cross-project topics, clearly indicate which projects the information comes from
- If information is not found in the context, clearly state that you don't have that information in the available recordings
- Use Dutch language when the user asks questions in Dutch, otherwise use English

Citation Guidelines:
- Use numbered citations [1], [2], [3] etc. immediately after statements that reference source material
- The citation numbers correspond to the order of sources provided in the context
- Multiple citations can be used like [1][2] if information comes from multiple sources
- Always cite your sources to help users verify information

General Guidelines:
- Focus on factual information from the recordings across all projects
- When discussing tasks, mention their priority, status, and which project they belong to
- Provide timestamps when available for transcription references
- Synthesize information across multiple projects and recordings when relevant
- Help identify patterns, trends, and insights across the organization's data
- When asked about specific topics, search across all projects to provide comprehensive answers`;
  }

  /**
   * Generate chat response using GPT-4-turbo with streaming
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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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
      } catch (error) {
        throw new Error("Conversation not found");
      }

      // Save user message
      const userMessageEntry: NewChatMessage = {
        conversationId,
        role: "user",
        content: userMessage,
      };
      await ChatQueries.createMessage(userMessageEntry);

      // Get relevant context using vector search
      const contextResult = await VectorSearchService.getRelevantContext(
        userMessage,
        projectId
      );

      let context = "";
      let sources: SourceReference[] = [];

      if (contextResult.isOk()) {
        context = contextResult.value.context;
        sources = contextResult.value.sources.map((source) => ({
          contentId: source.contentId,
          contentType: source.contentType,
          title: source.title,
          excerpt: source.excerpt,
          similarityScore: source.similarityScore,
          recordingId: source.recordingId,
          timestamp: source.timestamp,
        }));
      }

      // Get conversation history
      const messages = await ChatQueries.getMessagesByConversationId(
        conversationId
      );

      // Build conversation history for context (last 10 messages)
      const conversationHistory: CoreMessage[] = messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Build system prompt with guard rails
      const baseSystemPrompt = await this.buildSystemPrompt(projectId);
      const systemPromptWithGuardRails =
        buildSystemPromptWithGuardRails(baseSystemPrompt);

      // Get project template for RAG context
      const projectTemplate = await getCachedProjectTemplate(projectId);

      // Validate prompt safety (check for injection attempts)
      const safetyCheck = validatePromptSafety(userMessage, projectTemplate);
      if (!safetyCheck.safe) {
        logger.warn("Potential prompt injection detected", {
          conversationId,
          issues: safetyCheck.issues,
        });
        // Log but continue - the guard rails in system prompt will handle this
      }

      // Build complete prompt with XML tagging and priority hierarchy
      const ragContext = context
        ? `Here is relevant information from the project recordings:

${context}

Please answer the user's question based on this information.`
        : "No relevant information was found in the project recordings. Let the user know you don't have specific information to answer their question.";

      const completePrompt = buildCompletePrompt({
        systemInstructions: baseSystemPrompt,
        projectTemplate,
        ragContent: ragContext,
        userQuery: userMessage,
      });

      // Stream response from GPT-4-turbo
      const result = await streamText({
        model: this.openai("gpt-4-turbo"),
        system: systemPromptWithGuardRails,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: completePrompt,
          },
        ],
        temperature: 0.7,
      });

      // Collect the full response
      let fullResponse = "";
      for await (const textPart of result.textStream) {
        fullResponse += textPart;
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
      if (messages.length === 1 && !conversation.title) {
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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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
      } catch (error) {
        throw new Error("Conversation not found");
      }

      // Save user message
      const userMessageEntry: NewChatMessage = {
        conversationId,
        role: "user",
        content: userMessage,
      };
      await ChatQueries.createMessage(userMessageEntry);

      // Get relevant context using vector search
      const contextResult = await VectorSearchService.getRelevantContext(
        userMessage,
        projectId
      );

      let context = "";
      let sources: SourceReference[] = [];

      if (contextResult.isOk()) {
        context = contextResult.value.context;
        sources = contextResult.value.sources.map((source) => ({
          contentId: source.contentId,
          contentType: source.contentType,
          title: source.title,
          excerpt: source.excerpt,
          similarityScore: source.similarityScore,
          recordingId: source.recordingId,
          timestamp: source.timestamp,
        }));
      }

      // Get conversation history
      const messages = await ChatQueries.getMessagesByConversationId(
        conversationId
      );

      // Build conversation history for context (last 10 messages)
      const conversationHistory: CoreMessage[] = messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Build system prompt
      const systemPrompt = await this.buildSystemPrompt(projectId);

      // Get project template for RAG context
      const projectTemplate = await getCachedProjectTemplate(projectId);

      // Get organization settings for instructions
      const projectResult = await ProjectService.getProjectById(projectId);
      let orgInstructions: string | null = null;
      if (projectResult.isOk()) {
        const orgSettings = await getCachedOrganizationSettings(
          projectResult.value.organizationId
        );
        orgInstructions = orgSettings?.instructions ?? null;
      }

      // Create the full prompt with context
      const ragContext = context
        ? `Here is relevant information from the project recordings:

${context}

Please answer the user's question based on this information.`
        : "No relevant information was found in the project recordings. Let the user know you don't have specific information to answer their question.";

      // Build complete prompt with priority hierarchy
      const completePrompt = buildCompletePrompt({
        systemInstructions: systemPrompt,
        organizationInstructions: orgInstructions,
        projectTemplate,
        ragContent: ragContext,
        userQuery: userMessage,
      });

      // Stream response from GPT-4-turbo
      const result = streamText({
        model: this.openai("gpt-4-turbo"),
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: completePrompt,
          },
        ],
        temperature: 0.7,
        async onFinish({ text }) {
          // Save assistant message after streaming is complete
          const assistantMessageEntry: NewChatMessage = {
            conversationId,
            role: "assistant",
            content: text,
            sources,
          };
          await ChatQueries.createMessage(assistantMessageEntry);

          // Update conversation title if it's the first exchange
          if (messages.length === 1 && !conversation.title) {
            const title =
              userMessage.length > 50
                ? userMessage.substring(0, 50) + "..."
                : userMessage;
            await ChatQueries.updateConversationTitle(conversationId, title);
          }

          logger.info("Chat streaming completed", { conversationId });
        },
      });

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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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
      } catch (error) {
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

      // Get relevant context using organization-wide vector search
      const contextResult =
        await VectorSearchService.getRelevantContextOrganizationWide(
          userMessage,
          organizationId
        );

      let context = "";
      let sources: SourceReference[] = [];

      if (contextResult.isOk()) {
        context = contextResult.value.context;
        sources = contextResult.value.sources.map((source) => ({
          contentId: source.contentId,
          contentType: source.contentType,
          title: source.title,
          excerpt: source.excerpt,
          similarityScore: source.similarityScore,
          recordingId: source.recordingId,
          timestamp: source.timestamp,
        }));
      }

      // Get conversation history
      const messages = await ChatQueries.getMessagesByConversationId(
        conversationId
      );

      // Build conversation history for context (last 10 messages)
      const conversationHistory: CoreMessage[] = messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Build system prompt for organization
      const systemPrompt = this.buildOrganizationSystemPrompt();

      // Get organization settings for instructions
      const orgSettings = await getCachedOrganizationSettings(organizationId);
      const orgInstructions = orgSettings?.instructions ?? null;

      // Create the full prompt with context
      const ragContext = context
        ? `Here is relevant information from across all organization recordings and projects:

${context}

Please answer the user's question based on this information. When referencing information, mention which project it comes from.`
        : "No relevant information was found in the organization's recordings. Let the user know you don't have specific information to answer their question.";

      // Build complete prompt with priority hierarchy
      const completePrompt = buildCompletePrompt({
        systemInstructions: systemPrompt,
        organizationInstructions: orgInstructions,
        projectTemplate: null, // No project template for org-level chat
        ragContent: ragContext,
        userQuery: userMessage,
      });

      // Stream response from GPT-4-turbo
      const result = streamText({
        model: this.openai("gpt-4-turbo"),
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: completePrompt,
          },
        ],
        temperature: 0.7,
        async onFinish({ text }) {
          // Save assistant message after streaming is complete
          const assistantMessageEntry: NewChatMessage = {
            conversationId,
            role: "assistant",
            content: text,
            sources,
          };
          await ChatQueries.createMessage(assistantMessageEntry);

          // Update conversation title if it's the first exchange
          if (messages.length === 1 && !conversation.title) {
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
      });

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
    ActionResult<{ conversations: ChatConversation[]; total: number }>
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
  }): Promise<ActionResult<ChatConversation[]>> {
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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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
      } catch (error) {
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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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
      } catch (error) {
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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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
      } catch (error) {
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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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
      } catch (error) {
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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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

      const messages = await ChatQueries.getMessagesByConversationId(
        conversationId
      );

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
      const conversation = await ChatQueries.getConversationById(
        conversationId
      );
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

      const messages = await ChatQueries.getMessagesByConversationId(
        conversationId
      );

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
}

