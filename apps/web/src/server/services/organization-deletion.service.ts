import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import {
  agentMetrics,
  auditLogs,
  botSeriesSubscriptions,
  botSettings,
  chatAuditLog,
  chatConversations,
  chatEmbeddings,
  dataExports,
  driveWatches,
  knowledgeBaseDocuments,
  knowledgeBaseEntries,
  meetingAgendaTemplates,
  meetings,
  notifications,
  onboardings,
  organizationSettings,
  privacyRequests,
  projectTemplates,
  projects,
  recordings,
  taskTags,
  userDeletionRequests,
  worksCouncilApprovals,
} from "@/server/db/schema";
import { QdrantClientService } from "@/server/services/rag/qdrant.service";
import { getStorageProvider } from "@/server/services/storage";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

const COMPONENT = "OrganizationDeletionService";

/**
 * Deletes all data belonging to an organization in dependency order.
 *
 * Design principles:
 * - Individual table failures are logged but do NOT stop the overall deletion.
 * - The cron job can retry failed orgs on the next run.
 * - Tables with blob storage files are handled before the DB record is removed.
 * - auth.api.deleteOrganization() is called last — it cascades all Better Auth tables.
 */
export class OrganizationDeletionService {
  /**
   * Safely delete rows from a table, logging progress and swallowing errors.
   */
  private static async deleteTableSafe(
    tableName: string,
    organizationId: string,
    deleteFn: () => Promise<unknown>,
  ): Promise<void> {
    try {
      logger.info(`[${COMPONENT}] Deleting ${tableName}`, { organizationId });
      await deleteFn();
      logger.info(`[${COMPONENT}] Deleted ${tableName}`, { organizationId });
    } catch (error) {
      logger.error(`[${COMPONENT}] Failed to delete ${tableName}`, {
        organizationId,
        error,
      });
      // Intentionally swallow — allow the caller to continue
    }
  }

  /**
   * Delete all blob storage files for recordings in this organization.
   * Errors per file are logged but do not abort the loop.
   */
  private static async deleteRecordingFiles(
    organizationId: string,
  ): Promise<void> {
    const orgRecordings = await db
      .select({ id: recordings.id, fileUrl: recordings.fileUrl })
      .from(recordings)
      .where(eq(recordings.organizationId, organizationId));

    if (orgRecordings.length === 0) return;

    const storage = await getStorageProvider();

    for (const recording of orgRecordings) {
      if (!recording.fileUrl) continue;
      try {
        await storage.del(recording.fileUrl);
      } catch (error) {
        logger.warn(`[${COMPONENT}] Failed to delete recording blob`, {
          organizationId,
          recordingId: recording.id,
          fileUrl: recording.fileUrl,
          error,
        });
      }
    }

    logger.info(`[${COMPONENT}] Deleted recording blobs`, {
      organizationId,
      count: orgRecordings.length,
    });
  }

  /**
   * Delete all blob storage files for knowledge base documents in this organization.
   * Documents are scoped by organizationId via the scopeId column (scope = 'organization').
   * We also delete project-scoped documents that belong to projects in this org.
   */
  private static async deleteKnowledgeDocumentFiles(
    organizationId: string,
    projectIds: string[],
  ): Promise<void> {
    // Fetch org-scoped documents
    const orgDocs = await db
      .select({
        id: knowledgeBaseDocuments.id,
        fileUrl: knowledgeBaseDocuments.fileUrl,
      })
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.scopeId, organizationId));

    // Fetch project-scoped documents in one query
    const projectDocs =
      projectIds.length > 0
        ? await db
            .select({
              id: knowledgeBaseDocuments.id,
              fileUrl: knowledgeBaseDocuments.fileUrl,
            })
            .from(knowledgeBaseDocuments)
            .where(inArray(knowledgeBaseDocuments.scopeId, projectIds))
        : [];

    const allDocs = [...orgDocs, ...projectDocs];
    if (allDocs.length === 0) return;

    const storage = await getStorageProvider();

    for (const doc of allDocs) {
      try {
        await storage.del(doc.fileUrl);
      } catch (error) {
        logger.warn(`[${COMPONENT}] Failed to delete knowledge document blob`, {
          organizationId,
          documentId: doc.id,
          fileUrl: doc.fileUrl,
          error,
        });
      }
    }

    logger.info(`[${COMPONENT}] Deleted knowledge document blobs`, {
      organizationId,
      count: allDocs.length,
    });
  }

  /**
   * Delete all Qdrant vectors for this organization.
   */
  private static async deleteQdrantVectors(
    organizationId: string,
  ): Promise<void> {
    try {
      const qdrant = QdrantClientService.getInstance();
      const result = await qdrant.deleteByFilter({
        must: [{ key: "organizationId", match: { value: organizationId } }],
      });

      if (result.isErr()) {
        logger.error(`[${COMPONENT}] Failed to delete Qdrant vectors`, {
          organizationId,
          error: result.error,
        });
      } else {
        logger.info(`[${COMPONENT}] Deleted Qdrant vectors`, {
          organizationId,
        });
      }
    } catch (error) {
      logger.error(`[${COMPONENT}] Exception deleting Qdrant vectors`, {
        organizationId,
        error,
      });
    }
  }

  /**
   * Primary entry point — deletes all data for an organization.
   *
   * Deletion order (leaf → root, respecting FK dependencies):
   *
   * Leaf tables (no dependents):
   *  1.  audit_logs
   *  2.  chat_audit_log
   *  3.  agent_metrics
   *  4.  data_exports
   *  5.  privacy_requests
   *  6.  user_deletion_requests
   *  7.  works_council_approvals
   *  8.  onboardings
   *  9.  organization_settings
   *  10. meeting_agenda_templates
   *  11. task_tags  (tag assignments cascade via FK on taskTags.id)
   *  12. bot_settings
   *  13. bot_series_subscriptions
   *  14. notifications
   *  15. drive_watches
   *  16. feedback         (cascades on recordings.id)
   *  17. chat_conversations → chat_messages cascade
   *  18. chat_embeddings
   *  19. knowledge_base_entries (org/project scoped)
   *  20. knowledge_base_documents (files deleted first, then rows)
   *
   * Recording dependents (cascaded by DB, but we delete recordings explicitly):
   *  21. tasks  (cascade on recordings.id)
   *  22. recordings (files deleted first, then rows)
   *
   * Meeting dependents (cascade on meetings.id):
   *  23. meetings (agenda_items, notes, post_actions, share_tokens all cascade)
   *
   * Bot sessions (cascade on projects.id and meetings.id):
   *  24. bot_sessions
   *
   * Project templates (cascade on projects.id):
   *  25. project_templates
   *
   * Top-level org tables:
   *  26. projects
   *
   * Qdrant vectors:
   *  27. Qdrant deleteByFilter(organizationId)
   *
   * Better Auth (cascades members, invitations, teams, teamMembers, passkeys, twoFactors, sessions):
   *  28. auth.api.deleteOrganization()
   */
  static async deleteOrganizationData(organizationId: string): Promise<void> {
    logger.info(`[${COMPONENT}] Starting full organization deletion`, {
      organizationId,
    });

    // ------------------------------------------------------------------
    // 1. Audit logs
    // ------------------------------------------------------------------
    await this.deleteTableSafe("audit_logs", organizationId, () =>
      db.delete(auditLogs).where(eq(auditLogs.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 2. Chat audit log
    // ------------------------------------------------------------------
    await this.deleteTableSafe("chat_audit_log", organizationId, () =>
      db
        .delete(chatAuditLog)
        .where(eq(chatAuditLog.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 3. Agent metrics
    // ------------------------------------------------------------------
    await this.deleteTableSafe("agent_metrics", organizationId, () =>
      db
        .delete(agentMetrics)
        .where(eq(agentMetrics.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 4. Data exports
    // ------------------------------------------------------------------
    await this.deleteTableSafe("data_exports", organizationId, () =>
      db
        .delete(dataExports)
        .where(eq(dataExports.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 5. Privacy requests
    // ------------------------------------------------------------------
    await this.deleteTableSafe("privacy_requests", organizationId, () =>
      db
        .delete(privacyRequests)
        .where(eq(privacyRequests.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 6. User deletion requests
    // ------------------------------------------------------------------
    await this.deleteTableSafe("user_deletion_requests", organizationId, () =>
      db
        .delete(userDeletionRequests)
        .where(eq(userDeletionRequests.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 7. Works council approvals
    // ------------------------------------------------------------------
    await this.deleteTableSafe("works_council_approvals", organizationId, () =>
      db
        .delete(worksCouncilApprovals)
        .where(eq(worksCouncilApprovals.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 8. Onboardings
    // ------------------------------------------------------------------
    await this.deleteTableSafe("onboardings", organizationId, () =>
      db
        .delete(onboardings)
        .where(eq(onboardings.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 9. Organization settings
    // ------------------------------------------------------------------
    await this.deleteTableSafe("organization_settings", organizationId, () =>
      db
        .delete(organizationSettings)
        .where(eq(organizationSettings.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 10. Meeting agenda templates
    // ------------------------------------------------------------------
    await this.deleteTableSafe("meeting_agenda_templates", organizationId, () =>
      db
        .delete(meetingAgendaTemplates)
        .where(eq(meetingAgendaTemplates.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 11. Task tags (task_tag_assignments cascade on tag deletion)
    // ------------------------------------------------------------------
    await this.deleteTableSafe("task_tags", organizationId, () =>
      db.delete(taskTags).where(eq(taskTags.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 12. Bot settings
    // ------------------------------------------------------------------
    await this.deleteTableSafe("bot_settings", organizationId, () =>
      db
        .delete(botSettings)
        .where(eq(botSettings.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 13. Bot series subscriptions
    // ------------------------------------------------------------------
    await this.deleteTableSafe("bot_series_subscriptions", organizationId, () =>
      db
        .delete(botSeriesSubscriptions)
        .where(eq(botSeriesSubscriptions.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 14. Notifications
    // ------------------------------------------------------------------
    await this.deleteTableSafe("notifications", organizationId, () =>
      db
        .delete(notifications)
        .where(eq(notifications.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 15. Drive watches
    // ------------------------------------------------------------------
    await this.deleteTableSafe("drive_watches", organizationId, () =>
      db
        .delete(driveWatches)
        .where(eq(driveWatches.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 16. Chat conversations (chat_messages cascade on conversation deletion)
    // ------------------------------------------------------------------
    await this.deleteTableSafe("chat_conversations", organizationId, () =>
      db
        .delete(chatConversations)
        .where(eq(chatConversations.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 17. Chat embeddings
    // ------------------------------------------------------------------
    await this.deleteTableSafe("chat_embeddings", organizationId, () =>
      db
        .delete(chatEmbeddings)
        .where(eq(chatEmbeddings.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 18. Knowledge base entries (org-scoped)
    // ------------------------------------------------------------------
    await this.deleteTableSafe(
      "knowledge_base_entries (org)",
      organizationId,
      () =>
        db
          .delete(knowledgeBaseEntries)
          .where(eq(knowledgeBaseEntries.scopeId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 19. Knowledge base documents — delete blobs first, then DB rows.
    //     We need project IDs for project-scoped docs.
    // ------------------------------------------------------------------
    const orgProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId))
      .catch((error) => {
        logger.error(`[${COMPONENT}] Failed to fetch projects for org`, {
          organizationId,
          error,
        });
        return [] as Array<{ id: string }>;
      });

    const projectIds = orgProjects.map((p) => p.id);

    // Delete project-scoped knowledge base entries (batched)
    if (projectIds.length > 0) {
      await this.deleteTableSafe(
        "knowledge_base_entries (project-scoped)",
        organizationId,
        () =>
          db
            .delete(knowledgeBaseEntries)
            .where(inArray(knowledgeBaseEntries.scopeId, projectIds)),
      );
    }

    // Delete knowledge document blobs then DB rows
    await this.deleteTableSafe(
      "knowledge_base_documents (blobs)",
      organizationId,
      () => this.deleteKnowledgeDocumentFiles(organizationId, projectIds),
    );

    await this.deleteTableSafe(
      "knowledge_base_documents (org)",
      organizationId,
      () =>
        db
          .delete(knowledgeBaseDocuments)
          .where(eq(knowledgeBaseDocuments.scopeId, organizationId)),
    );

    if (projectIds.length > 0) {
      await this.deleteTableSafe(
        "knowledge_base_documents (project-scoped)",
        organizationId,
        () =>
          db
            .delete(knowledgeBaseDocuments)
            .where(inArray(knowledgeBaseDocuments.scopeId, projectIds)),
      );
    }

    // ------------------------------------------------------------------
    // 20. Recording blob files (delete before DB rows)
    // ------------------------------------------------------------------
    await this.deleteTableSafe("recordings (blobs)", organizationId, () =>
      this.deleteRecordingFiles(organizationId),
    );

    // ------------------------------------------------------------------
    // 21. Recordings — tasks, ai_insights, redactions, consent_participants,
    //     consent_audit_log, summary_history, transcription_history,
    //     reprocessing_history, task_history, auto_actions, bot_sessions,
    //     notifications, feedback, transcript_chunks all cascade via FK.
    // ------------------------------------------------------------------
    await this.deleteTableSafe("recordings", organizationId, () =>
      db
        .delete(recordings)
        .where(eq(recordings.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 22. Meetings — agenda_items, notes, post_actions, share_tokens cascade.
    //     bot_sessions reference meetings via set null so already handled.
    // ------------------------------------------------------------------
    await this.deleteTableSafe("meetings", organizationId, () =>
      db.delete(meetings).where(eq(meetings.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 23. Project templates (cascade on project deletion, but we also delete
    //     explicitly to be safe before projects are removed)
    // ------------------------------------------------------------------
    await this.deleteTableSafe("project_templates", organizationId, () =>
      db
        .delete(projectTemplates)
        .where(eq(projectTemplates.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 24. Projects
    // ------------------------------------------------------------------
    await this.deleteTableSafe("projects", organizationId, () =>
      db.delete(projects).where(eq(projects.organizationId, organizationId)),
    );

    // ------------------------------------------------------------------
    // 25. Qdrant vectors
    // ------------------------------------------------------------------
    await this.deleteTableSafe("qdrant_vectors", organizationId, () =>
      this.deleteQdrantVectors(organizationId),
    );

    // ------------------------------------------------------------------
    // 26. Better Auth organization (cascades members, invitations, teams,
    //     teamMembers, passkeys, twoFactors, sessions)
    // ------------------------------------------------------------------
    try {
      logger.info(`[${COMPONENT}] Calling auth.api.deleteOrganization`, {
        organizationId,
      });

      await auth.api.deleteOrganization({
        body: { organizationId },
        // Server-side call — no browser headers needed
        headers: new Headers(),
      });

      logger.info(`[${COMPONENT}] auth.api.deleteOrganization completed`, {
        organizationId,
      });
    } catch (error) {
      logger.error(
        `[${COMPONENT}] auth.api.deleteOrganization failed — org auth data may remain`,
        { organizationId, error },
      );
    }

    logger.info(`[${COMPONENT}] Organization deletion complete`, {
      organizationId,
    });
  }
}
