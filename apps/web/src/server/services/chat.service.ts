import { logger } from "@/lib/logger";
import { ChatQueries } from "@/server/data-access/chat.queries";
import { ProjectService } from "./project.service";
import { VectorSearchService } from "./vector-search.service";
import { type NewChatConversation, type NewChatMessage, type SourceReference } from "@/server/db/schema";
import { err, ok, type Result } from "neverthrow";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";

export class ChatService {
  private static openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  });

  /**
   * Create a new conversation for a project
   */
  static async createConversation(
    projectId: string,
    userId: string,
    organizationId: string
  ): Promise<Result<{ conversationId: string }, Error>> {
    try {
      const conversation: NewChatConversation = {
        projectId,
        userId,
        organizationId,
      };

      const result = await ChatQueries.createConversation(conversation);

      return ok({ conversationId: result.id });
    } catch (error) {
      logger.error("Error creating conversation", { error, projectId, userId });
      return err(
        error instanceof Error ? error : new Error("Unknown error")
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
      return err(
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  }

  /**
   * Build system prompt with project context
   */
  private static async buildSystemPrompt(
    projectId: string
  ): Promise<string> {
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
- Cite sources by mentioning the recording title and date when referencing specific information
- Be concise and accurate in your responses
- If information is not found in the context, clearly state that you don't have that information in the available recordings
- Use Dutch language when the user asks questions in Dutch, otherwise use English

Guidelines:
- Focus on factual information from the recordings
- When discussing tasks, mention their priority and status
- Provide timestamps when available for transcription references
- If asked about specific topics across multiple recordings, synthesize the information clearly`;
  }

  /**
   * Generate chat response using GPT-4-turbo with streaming
   */
  static async generateResponse(
    conversationId: string,
    userMessage: string,
    projectId: string
  ) {
    try {
      logger.info("Generating chat response", { conversationId, projectId });

      // Get conversation to verify access
      const conversation = await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
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

      // Create the full prompt with context
      const contextPrompt = context
        ? `Here is relevant information from the project recordings:

${context}

Please answer the user's question based on this information.`
        : "No relevant information was found in the project recordings. Let the user know you don't have specific information to answer their question.";

      // Stream response from GPT-4-turbo
      const result = await streamText({
        model: this.openai("gpt-4-turbo"),
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: `${contextPrompt}\n\nUser question: ${userMessage}`,
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
      return err(
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  }

  /**
   * Stream chat response (returns a StreamableValue for use with Vercel AI SDK)
   */
  static async streamResponse(
    conversationId: string,
    userMessage: string,
    projectId: string
  ) {
    try {
      logger.info("Streaming chat response", { conversationId, projectId });

      // Get conversation to verify access
      const conversation = await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
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

      // Create the full prompt with context
      const contextPrompt = context
        ? `Here is relevant information from the project recordings:

${context}

Please answer the user's question based on this information.`
        : "No relevant information was found in the project recordings. Let the user know you don't have specific information to answer their question.";

      // Stream response from GPT-4-turbo
      const result = await streamText({
        model: this.openai("gpt-4-turbo"),
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: `${contextPrompt}\n\nUser question: ${userMessage}`,
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

      return ok({ stream: result.toTextStreamResponse(), sources });
    } catch (error) {
      logger.error("Error streaming chat response", {
        error,
        conversationId,
        projectId,
      });
      return err(
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  }

  /**
   * Delete conversation
   */
  static async deleteConversation(
    conversationId: string
  ): Promise<Result<void, Error>> {
    try {
      await ChatQueries.deleteConversation(conversationId);
      return ok(undefined);
    } catch (error) {
      logger.error("Error deleting conversation", { error, conversationId });
      return err(
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  }
}

