import {
  ActionErrors,
  createActionError,
  type ActionResult,
} from "@/lib/action-errors";
import { AuthService } from "@/lib/kinde-api";
import { logger } from "@/lib/logger";
import * as archiver from "archiver";
import { addDays } from "date-fns";
import { err, ok } from "neverthrow";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";
import { ChatQueries } from "../data-access/chat.queries";
import { DataExportsQueries } from "../data-access/data-exports.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { TasksQueries } from "../data-access/tasks.queries";
import type { DataExport } from "../db/schema/data-exports";

export interface ExportFilters {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  projectId?: string;
}

export interface UserExportData {
  user: {
    id: string;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    picture: string | null;
    created_on?: string;
    last_signed_in?: string;
  };
  recordings: Array<{
    id: string;
    title: string;
    description: string | null;
    transcription: string | null;
    metadata: Record<string, unknown>;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    assigneeId: string | null;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  summaries: Array<{
    id: string;
    recordingId: string;
    content: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
  chatHistory: Array<{
    conversation: {
      id: string;
      title: string | null;
      context: string;
      createdAt: string;
      updatedAt: string;
    };
    messages: Array<{
      id: string;
      role: string;
      content: string;
      sources: unknown | null;
      createdAt: string;
    }>;
  }>;
  exportDate: string;
  exportMetadata: {
    version: string;
    format: string;
  };
}

/**
 * GDPR Export Service
 * Handles data export functionality for GDPR compliance
 */
export class GdprExportService {
  /**
   * Create a new export request
   */
  static async createExportRequest(
    userId: string,
    organizationId: string,
    filters?: ExportFilters
  ): Promise<ActionResult<DataExport>> {
    try {
      const expiresAt = addDays(new Date(), 7);

      const export_ = await DataExportsQueries.createExport({
        userId,
        organizationId,
        status: "pending",
        expiresAt,
        recordingsCount: 0,
        tasksCount: 0,
        conversationsCount: 0,
      });

      logger.info("Created export request", {
        component: "GdprExportService.createExportRequest",
        exportId: export_.id,
        userId,
        organizationId,
      });

      // Start async export generation
      // In production, this would be queued, but for now we'll process synchronously
      // for small datasets and asynchronously for large ones
      this.generateExport(userId, organizationId, export_.id, filters).catch(
        (error) => {
          logger.error("Failed to generate export", {
            component: "GdprExportService.createExportRequest",
            exportId: export_.id,
            error,
          });
        }
      );

      return ok(export_);
    } catch (error) {
      logger.error("Failed to create export request", {
        component: "GdprExportService.createExportRequest",
        userId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to create export request",
          error as Error,
          "GdprExportService.createExportRequest"
        )
      );
    }
  }

  /**
   * Generate export file
   */
  static async generateExport(
    userId: string,
    organizationId: string,
    exportId: string,
    filters?: ExportFilters
  ): Promise<ActionResult<void>> {
    try {
      // Update status to processing
      await DataExportsQueries.updateExportStatus(exportId, "processing");

      logger.info("Starting export generation", {
        component: "GdprExportService.generateExport",
        exportId,
        userId,
        organizationId,
      });

      // Aggregate user data
      const dataResult = await this.aggregateUserData(
        userId,
        organizationId,
        filters
      );

      if (dataResult.isErr()) {
        await DataExportsQueries.updateExportStatus(exportId, "failed", {
          errorMessage: dataResult.error.message,
        });
        return err(dataResult.error);
      }

      const data = dataResult.value;

      // Create ZIP archive
      const zipBuffer = await this.createZipArchive(data);

      // Store file data in database
      await DataExportsQueries.updateExportStatus(exportId, "completed", {
        fileData: zipBuffer,
        fileSize: zipBuffer.length,
        recordingsCount: data.recordings.length,
        tasksCount: data.tasks.length,
        conversationsCount: data.chatHistory.length,
        completedAt: new Date(),
      });

      logger.info("Export generation completed", {
        component: "GdprExportService.generateExport",
        exportId,
        fileSize: zipBuffer.length,
        recordingsCount: data.recordings.length,
        tasksCount: data.tasks.length,
        conversationsCount: data.chatHistory.length,
      });

      // Note: In-app notifications require recordingId and projectId which don't apply to exports
      // Users can check export status in the settings page
      // TODO: Implement email notification when US-006 (Email Sending Infrastructure) is available
      // TODO: Consider extending notification schema to support export notifications (nullable recordingId/projectId)

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to generate export", {
        component: "GdprExportService.generateExport",
        exportId,
        error,
      });

      await DataExportsQueries.updateExportStatus(exportId, "failed", {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return err(
        ActionErrors.internal(
          "Failed to generate export",
          error as Error,
          "GdprExportService.generateExport"
        )
      );
    }
  }

  /**
   * Aggregate all user data for export
   */
  static async aggregateUserData(
    userId: string,
    organizationId: string,
    filters?: ExportFilters
  ): Promise<ActionResult<UserExportData>> {
    try {
      // Get user profile from Kinde
      let userProfile: UserExportData["user"];
      try {
        const Users = await AuthService.getUsers();
        const kindeUser = await Users.getUserData({ id: userId });

        userProfile = {
          id: kindeUser.id || userId,
          email: kindeUser.preferred_email || null,
          given_name: kindeUser.first_name || null,
          family_name: kindeUser.last_name || null,
          picture: kindeUser.picture || null,
          created_on: kindeUser.created_on || undefined,
          last_signed_in: kindeUser.last_signed_in || undefined,
        };
      } catch (error) {
        logger.warn("Failed to fetch user profile from Kinde", {
          component: "GdprExportService.aggregateUserData",
          userId,
          error,
        });
        // Fallback to basic user info
        userProfile = {
          id: userId,
          email: null,
          given_name: null,
          family_name: null,
          picture: null,
        };
      }

      // Get recordings
      const recordingsQueryOptions: Parameters<
        typeof RecordingsQueries.selectRecordingsByOrganization
      >[1] = {
        statusFilter: "active",
      };

      if (filters?.projectId) {
        recordingsQueryOptions.projectIds = [filters.projectId];
      }

      const recordings = await RecordingsQueries.selectRecordingsByOrganization(
        organizationId,
        recordingsQueryOptions
      );

      // Filter by date range if provided
      let filteredRecordings = recordings;
      if (filters?.dateRange) {
        const dateRange = filters.dateRange;
        filteredRecordings = recordings.filter((recording) => {
          const recordingDate = recording.recordingDate;
          return (
            recordingDate >= dateRange.startDate &&
            recordingDate <= dateRange.endDate
          );
        });
      }

      // Filter recordings created by this user
      const userRecordings = filteredRecordings.filter(
        (r) => r.createdById === userId
      );

      // Get tasks
      const tasksQueryFilters: Parameters<
        typeof TasksQueries.getTasksByOrganization
      >[1] = {
        assigneeId: userId,
      };

      if (filters?.projectId) {
        tasksQueryFilters.projectIds = [filters.projectId];
      }

      const allTasks = await TasksQueries.getTasksByOrganization(
        organizationId,
        tasksQueryFilters
      );

      // Filter by date range if provided
      let filteredTasks = allTasks;
      if (filters?.dateRange) {
        const dateRange = filters.dateRange;
        filteredTasks = allTasks.filter((task) => {
          const taskDate = task.createdAt;
          return (
            taskDate >= dateRange.startDate && taskDate <= dateRange.endDate
          );
        });
      }

      // Get summaries (AI insights with type "summary")
      const recordingIds = userRecordings.map((r) => r.id);
      const summaries: UserExportData["summaries"] = [];

      if (recordingIds.length > 0) {
        const allInsights = await AIInsightsQueries.getInsightsByRecordingIds(
          recordingIds
        );

        // Group insights by recording ID
        const insightsByRecording = new Map<string, typeof allInsights>();
        for (const insight of allInsights) {
          if (!insightsByRecording.has(insight.recordingId)) {
            insightsByRecording.set(insight.recordingId, []);
          }
          insightsByRecording.get(insight.recordingId)!.push(insight);
        }

        // Extract summary insights
        for (const recordingId of recordingIds) {
          const insights = insightsByRecording.get(recordingId) || [];
          const summaryInsight = insights.find(
            (i) => i.insightType === "summary"
          );
          if (summaryInsight) {
            summaries.push({
              id: summaryInsight.id,
              recordingId: summaryInsight.recordingId,
              content: summaryInsight.content,
              createdAt: summaryInsight.createdAt.toISOString(),
              updatedAt: summaryInsight.updatedAt.toISOString(),
            });
          }
        }
      }

      // Get chat conversations and messages
      const conversations = await ChatQueries.getConversationsByOrganizationId(
        organizationId,
        userId
      );

      // Filter by date range if provided
      let filteredConversations = conversations;
      if (filters?.dateRange) {
        const dateRange = filters.dateRange;
        filteredConversations = conversations.filter((conv) => {
          const convDate = conv.createdAt;
          return (
            convDate >= dateRange.startDate && convDate <= dateRange.endDate
          );
        });
      }

      // Filter by project if provided
      if (filters?.projectId) {
        filteredConversations = filteredConversations.filter(
          (conv) => conv.projectId === filters.projectId
        );
      }

      const chatHistory: UserExportData["chatHistory"] = [];

      if (filteredConversations.length > 0) {
        const conversationIds = filteredConversations.map((c) => c.id);

        // Process conversationIds in chunks to avoid overwhelming the DB
        const BATCH_SIZE = 10;
        const allMessages: Awaited<
          ReturnType<typeof ChatQueries.getMessagesByConversationIds>
        > = [];

        // Process batches sequentially to avoid overwhelming the database
        for (let i = 0; i < conversationIds.length; i += BATCH_SIZE) {
          const batch = conversationIds.slice(i, i + BATCH_SIZE);
          const batchMessages = await ChatQueries.getMessagesByConversationIds(
            batch
          );
          allMessages.push(...batchMessages);
        }

        // Group messages by conversation
        const messagesByConversation = new Map<string, typeof allMessages>();
        for (const msg of allMessages) {
          if (!messagesByConversation.has(msg.conversationId)) {
            messagesByConversation.set(msg.conversationId, []);
          }
          messagesByConversation.get(msg.conversationId)!.push(msg);
        }

        for (const conversation of filteredConversations) {
          const messages = messagesByConversation.get(conversation.id) || [];
          chatHistory.push({
            conversation: {
              id: conversation.id,
              title: conversation.title || null,
              context: conversation.context,
              createdAt: conversation.createdAt.toISOString(),
              updatedAt: conversation.updatedAt.toISOString(),
            },
            messages: messages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              sources: msg.sources || null,
              createdAt: msg.createdAt.toISOString(),
            })),
          });
        }
      }

      const exportData: UserExportData = {
        user: userProfile,
        recordings: userRecordings.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          transcription: r.transcriptionText,
          metadata: {
            fileName: r.fileName,
            fileSize: r.fileSize,
            fileMimeType: r.fileMimeType,
            duration: r.duration,
            recordingDate: r.recordingDate.toISOString(),
            recordingMode: r.recordingMode,
            language: r.language,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          },
        })),
        tasks: filteredTasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          assigneeId: t.assigneeId,
          dueDate: t.dueDate?.toISOString() || null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        summaries,
        chatHistory,
        exportDate: new Date().toISOString(),
        exportMetadata: {
          version: "1.0",
          format: "json",
        },
      };

      return ok(exportData);
    } catch (error) {
      logger.error("Failed to aggregate user data", {
        component: "GdprExportService.aggregateUserData",
        userId,
        organizationId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to aggregate user data",
          error as Error,
          "GdprExportService.aggregateUserData"
        )
      );
    }
  }

  /**
   * Create ZIP archive from export data
   */
  private static async createZipArchive(data: UserExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver.default("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      archive.on("error", (error) => {
        reject(error);
      });

      // Add main data file
      const jsonData = JSON.stringify(data, null, 2);
      archive.append(jsonData, { name: "user-data.json" });

      // Finalize the archive
      archive.finalize();
    });
  }

  /**
   * Get export by ID (with ownership verification)
   */
  static async getExportById(
    exportId: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<DataExport>> {
    try {
      const export_ = await DataExportsQueries.getExportById(exportId);

      if (!export_) {
        return err(
          ActionErrors.notFound("Export", "GdprExportService.getExportById")
        );
      }

      // Verify ownership
      if (
        export_.userId !== userId ||
        export_.organizationId !== organizationId
      ) {
        return err(
          ActionErrors.forbidden(
            "You do not have access to this export",
            { exportId, userId },
            "GdprExportService.getExportById"
          )
        );
      }

      // Check expiration
      if (export_.expiresAt < new Date()) {
        return err(
          createActionError("BAD_REQUEST", "Export has expired", {
            metadata: { exportId, expiresAt: export_.expiresAt },
            context: "GdprExportService.getExportById",
          })
        );
      }

      return ok(export_);
    } catch (error) {
      logger.error("Failed to get export", {
        component: "GdprExportService.getExportById",
        exportId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get export",
          error as Error,
          "GdprExportService.getExportById"
        )
      );
    }
  }

  /**
   * Get all exports for a user
   */
  static async getExportsByUserId(
    userId: string,
    organizationId: string
  ): Promise<ActionResult<DataExport[]>> {
    try {
      const exports = await DataExportsQueries.getExportsByUserId(
        userId,
        organizationId
      );
      return ok(exports);
    } catch (error) {
      logger.error("Failed to get exports", {
        component: "GdprExportService.getExportsByUserId",
        userId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get exports",
          error as Error,
          "GdprExportService.getExportsByUserId"
        )
      );
    }
  }
}

