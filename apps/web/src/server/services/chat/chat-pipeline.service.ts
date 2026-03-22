/**
 * Chat Pipeline Service
 *
 * The deep module: a single entry point (`sendMessage`) that handles
 * the entire streaming pipeline for both project and organization scopes.
 *
 * Internally handles: conversation creation, input moderation, message
 * persistence, conversation context retrieval, knowledge context assembly,
 * prompt construction, integrity stamping, guarded model creation,
 * tool binding, LLM streaming, and onFinish side effects (message save,
 * metrics, provenance, token budget, grounding, title generation).
 */

import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import type { ProjectTemplateDto } from "@/server/dto/project-template.dto";
import { getCachedAgentSettings } from "@/server/cache/agent-settings.cache";
import { getCachedOrganizationSettings } from "@/server/cache/organization-settings.cache";
import { ChatQueries } from "@/server/data-access/chat.queries";
import type { NewChatMessage } from "@/server/db/schema/chat-messages";
import { stepCountIs, streamText } from "ai";
import { err, ok } from "neverthrow";
import { createGuardedModel } from "../../ai/middleware";
import { moderateUserInput } from "../../ai/middleware/input-moderation.middleware";
import { checkOutputGrounding } from "../../ai/middleware/output-grounding.middleware";
import { getCachedProjectTemplate } from "../../cache/project-template.cache";
import { AgentMetricsService } from "../agent-metrics.service";
import { AgentTokenBudgetService } from "../agent-token-budget.service";
import { connectionPool } from "../connection-pool.service";
import { ConversationContextManager } from "../conversation-context-manager.service";
import { ConversationIntegrityService } from "../conversation-integrity.service";
import { KnowledgeBaseService } from "../knowledge-base.service";
import { ModelProvenanceService } from "../model-provenance.service";
import { ProjectService } from "../project.service";
import { PromptBuilder } from "../prompt-builder.service";
import { PromptIntegrityService } from "../prompt-integrity.service";
import {
  buildPersistedToolCalls,
  createChatTools,
  extractSourcesFromToolResults,
  resetToolCallCount,
  type ToolContext,
} from "../tools";
import { ConversationService } from "./conversation.service";
import type {
  ChatCaller,
  ChatRequest,
  ChatScope,
  ChatStreamResult,
} from "./types";

export class ChatPipeline {
  /**
   * Send a message and get a streaming response.
   *
   * If `request.conversationId` is omitted, a new conversation is created
   * automatically (project-scoped or organization-scoped based on scope.kind).
   *
   * The returned Response is a Vercel AI SDK UIMessageStreamResponse ready
   * to return directly from a Next.js API route handler.
   */
  static async sendMessage(
    caller: ChatCaller,
    request: ChatRequest,
  ): Promise<ActionResult<ChatStreamResult>> {
    try {
      // --- Resolve conversation ---
      let conversationId = request.conversationId;

      if (!conversationId) {
        const createResult = await this.createConversationForScope(
          caller,
          request.scope,
        );
        if (createResult.isErr()) return err(createResult.error);
        conversationId = createResult.value;
      }

      // --- Verify conversation access ---
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      try {
        assertOrganizationAccess(
          conversation.organizationId,
          caller.organizationId,
          "ChatPipeline.sendMessage",
        );
      } catch {
        throw new Error("Conversation not found");
      }

      // Verify org-level conversation is actually org-level
      if (
        request.scope.kind === "organization" &&
        conversation.projectId !== null
      ) {
        throw new Error("This is not an organization-level conversation");
      }

      // --- Input moderation ---
      await moderateUserInput(request.message);

      // --- Save user message (only after moderation passes) ---
      const userMessageEntry: NewChatMessage = {
        conversationId,
        role: "user",
        content: request.message,
      };
      await ChatQueries.createMessage(userMessageEntry);

      // --- Get conversation context (history + summary) ---
      const conversationContextResult =
        await ConversationContextManager.getConversationContext(conversationId);

      if (conversationContextResult.isErr()) {
        logger.error("Failed to get conversation context", {
          component: "ChatPipeline.sendMessage",
          conversationId,
          error: conversationContextResult.error,
        });
        return err(conversationContextResult.error);
      }

      const conversationHistory = conversationContextResult.value.messages;
      const conversationSummary = conversationContextResult.value.summary;

      // --- Resolve scope-specific context ---
      const scopeContext = await this.resolveScopeContext(
        request.scope,
        caller,
      );

      // --- Build RAG context ---
      let ragContextWithSummary = "";
      if (conversationSummary) {
        ragContextWithSummary = `Previous conversation summary:\n${conversationSummary}`;
      }

      // --- Build prompt ---
      const promptResult = PromptBuilder.Chat.buildPrompt({
        projectId: scopeContext.projectId,
        organizationId: scopeContext.organizationId,
        projectName: scopeContext.projectName,
        projectDescription: scopeContext.projectDescription,
        knowledgeContext: scopeContext.knowledgeContext,
        ragContent: ragContextWithSummary,
        userQuery: request.message,
        organizationInstructions: scopeContext.orgInstructions,
        projectTemplate: scopeContext.projectTemplate,
        isOrganizationLevel: request.scope.kind === "organization",
      });

      // --- Stamp prompt for integrity ---
      const stampedPrompt = PromptIntegrityService.stamp(
        promptResult.systemPrompt,
      );

      // --- Get agent settings ---
      const agentSettings = await getCachedAgentSettings();

      // --- Acquire guarded model with connection pool tracking ---
      const tracked = connectionPool.getAnthropicAISdkClientWithTracking();
      const anthropic = tracked.client;
      const pooled = tracked.pooled;
      let streamError: Error | null = null;
      let errorMetricTracked = false;

      const startTime = Date.now();
      const userId = conversation.userId;

      let guardedModel;
      try {
        guardedModel = createGuardedModel(anthropic(agentSettings.model), {
          organizationId: caller.organizationId,
          userId,
          conversationId,
          projectId:
            request.scope.kind === "project"
              ? request.scope.projectId
              : undefined,
          chatContext:
            request.scope.kind === "project" ? "project" : "organization",
          requestType: "chat",
          pii: { mode: "redact" },
        });
      } catch (setupError) {
        pooled.activeRequests--;
        throw setupError;
      }

      // --- Build tool context ---
      const toolContext: ToolContext = {
        organizationId: caller.organizationId,
        userId: caller.userId,
        projectId:
          request.scope.kind === "project"
            ? request.scope.projectId
            : undefined,
        chatContext:
          request.scope.kind === "project" ? "project" : "organization",
        userRole: caller.userRole,
        conversationId,
        teamId: caller.teamId,
        userTeamIds: caller.userTeamIds,
      };

      // --- Validate conversation context bounds ---
      ConversationIntegrityService.validateContextBounds(
        conversationHistory.map((m) => ({
          role: String(m.role),
          content:
            typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content),
        })),
      );

      // --- Determine step budget by role ---
      const maxSteps = caller.userRole === "viewer" ? 5 : 10;

      // --- Build streamText options ---
      const streamTextOptions: Parameters<typeof streamText>[0] = {
        model: guardedModel,
        system: PromptIntegrityService.verifyOrThrow(stampedPrompt),
        tools: createChatTools(toolContext),
        stopWhen: stepCountIs(maxSteps),
        messages: [
          ...conversationHistory,
          {
            role: "user",
            content: promptResult.userPrompt,
          },
        ],
        onError: async ({ error }) => {
          pooled.activeRequests--;
          resetToolCallCount(conversationId);
          streamError =
            error instanceof Error ? error : new Error(String(error));

          const latencyMs = Date.now() - startTime;

          await AgentMetricsService.trackRequest({
            organizationId: caller.organizationId,
            userId,
            conversationId,
            requestType: "chat",
            latencyMs,
            error: true,
            errorMessage: streamError.message,
            query: request.message,
          });
          errorMetricTracked = true;

          logger.error("Stream error during chat response streaming", {
            component: "ChatPipeline.sendMessage",
            conversationId,
            scope: request.scope.kind,
            error: streamError,
          });
        },
        async onFinish({ text, usage, toolCalls, toolResults }) {
          pooled.activeRequests--;
          resetToolCallCount(conversationId);

          const latencyMs = Date.now() - startTime;

          if (streamError) {
            if (!errorMetricTracked) {
              await AgentMetricsService.trackRequest({
                organizationId: caller.organizationId,
                userId,
                conversationId,
                requestType: "chat",
                latencyMs,
                error: true,
                errorMessage: streamError.message,
                query: request.message,
              });
            }

            logger.warn("Stream finished with error, not saving message", {
              component: "ChatPipeline.sendMessage",
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
            organizationId: caller.organizationId,
            userId,
            conversationId,
            requestType: "chat",
            latencyMs,
            error: false,
            tokenCount: usage?.totalTokens,
            toolCalls: toolCallNames,
            query: request.message,
          });

          // Record token usage against organization budget
          if (usage?.totalTokens) {
            await AgentTokenBudgetService.recordUsage(
              caller.organizationId,
              usage.totalTokens,
            );
          }

          // Log model provenance for audit trail
          ModelProvenanceService.logInvocation({
            modelId: agentSettings.model,
            provider: "anthropic",
            organizationId: caller.organizationId,
            conversationId,
            usage: {
              inputTokens: usage?.inputTokens,
              outputTokens: usage?.outputTokens,
              totalTokens: usage?.totalTokens,
            },
          });

          // Extract sources from searchKnowledge tool results
          const sources = extractSourcesFromToolResults(toolCalls, toolResults);

          // Save assistant message after streaming is complete
          const assistantMessageEntry: NewChatMessage = {
            conversationId,
            role: "assistant",
            content: text,
            sources,
            toolCalls: buildPersistedToolCalls(toolCalls, toolResults),
          };
          await ChatQueries.createMessage(assistantMessageEntry);

          // Check output grounding quality (non-blocking, metrics only)
          const hadToolResults = (toolResults?.length ?? 0) > 0;
          checkOutputGrounding(text, hadToolResults);

          // Update conversation title if it's the first exchange
          if (conversationHistory.length === 1 && !conversation.title) {
            const title =
              request.message.length > 50
                ? request.message.substring(0, 50) + "..."
                : request.message;
            await ChatQueries.updateConversationTitle(conversationId, title);
          }

          logger.info("Chat streaming completed", {
            conversationId,
            scope: request.scope.kind,
          });
        },
      };

      // Apply model settings
      streamTextOptions.temperature = agentSettings.temperature;
      streamTextOptions.topP = agentSettings.topP;

      const result = streamText(streamTextOptions);

      return ok({
        response: result.toUIMessageStreamResponse(),
        conversationId,
      });
    } catch (error) {
      logger.error("Error in ChatPipeline.sendMessage", {
        error,
        scope: request.scope.kind,
      });
      return err(
        ActionErrors.internal(
          error instanceof Error ? error.message : "Unknown error",
          error instanceof Error ? error : undefined,
          "ChatPipeline.sendMessage",
        ),
      );
    }
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Create a conversation for the given scope
   */
  private static async createConversationForScope(
    caller: ChatCaller,
    scope: ChatScope,
  ): Promise<ActionResult<string>> {
    if (scope.kind === "project") {
      const result = await ConversationService.createConversation(
        scope.projectId,
        caller.userId,
        caller.organizationId,
      );
      if (result.isErr()) return err(result.error);
      return ok(result.value.conversationId);
    }

    const result = await ConversationService.createOrganizationConversation(
      caller.userId,
      caller.organizationId,
    );
    if (result.isErr()) return err(result.error);
    return ok(result.value.conversationId);
  }

  /**
   * Resolve scope-specific context (project info, knowledge base, org instructions, template)
   */
  private static async resolveScopeContext(
    scope: ChatScope,
    caller: ChatCaller,
  ): Promise<ScopeContext> {
    if (scope.kind === "project") {
      return this.resolveProjectContext(scope.projectId, caller);
    }

    return this.resolveOrganizationContext(scope.organizationId, caller);
  }

  private static async resolveProjectContext(
    projectId: string,
    caller: ChatCaller,
  ): Promise<ScopeContext> {
    const projectResult = await ProjectService.getProjectById(projectId);
    const project = projectResult.isOk() ? projectResult.value : null;

    let knowledgeContext = "";
    if (project) {
      const knowledgeResult = await KnowledgeBaseService.buildKnowledgeContext(
        projectId,
        project.organizationId,
        caller.teamId ?? null,
      );
      if (knowledgeResult.isOk()) {
        knowledgeContext = knowledgeResult.value;
      }
    }

    const projectTemplate = await getCachedProjectTemplate(projectId);

    let orgInstructions: string | null = null;
    if (project) {
      const orgSettings = await getCachedOrganizationSettings(
        project.organizationId,
      );
      orgInstructions = orgSettings?.instructions ?? null;
    }

    return {
      projectId,
      organizationId: project?.organizationId ?? null,
      projectName: project?.name,
      projectDescription: project?.description ?? null,
      knowledgeContext,
      orgInstructions,
      projectTemplate,
    };
  }

  private static async resolveOrganizationContext(
    organizationId: string,
    caller: ChatCaller,
  ): Promise<ScopeContext> {
    const knowledgeResult = await KnowledgeBaseService.buildKnowledgeContext(
      null,
      organizationId,
      caller.teamId ?? null,
    );
    const knowledgeContext = knowledgeResult.isOk()
      ? knowledgeResult.value
      : "";

    const orgSettings = await getCachedOrganizationSettings(organizationId);
    const orgInstructions = orgSettings?.instructions ?? null;

    return {
      projectId: undefined,
      organizationId,
      projectName: undefined,
      projectDescription: null,
      knowledgeContext,
      orgInstructions,
      projectTemplate: null,
    };
  }
}

// ============================================================================
// Internal types
// ============================================================================

interface ScopeContext {
  projectId?: string;
  organizationId: string | null;
  projectName?: string;
  projectDescription: string | null;
  knowledgeContext: string;
  orgInstructions: string | null;
  projectTemplate: ProjectTemplateDto | null;
}
