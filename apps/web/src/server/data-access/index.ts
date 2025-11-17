// Export all query classes for easy importing
export { AIInsightsQueries } from "./ai-insights.queries";
export { AuditLogsQueries, type AuditLogFilters } from "./audit-logs.queries";
export * from "./auto-actions.queries";
export {
  ChatAuditQueries,
  type AuditLogFilters as ChatAuditLogFilters,
} from "./chat-audit.queries";
export { ChatQueries } from "./chat.queries";
export { ConsentQueries } from "./consent.queries";
export { DriveWatchesQueries } from "./drive-watches.queries";
export { EmbeddingCacheQueries } from "./embedding-cache.queries";
// @deprecated Use RAGService instead - PostgreSQL embeddings migrated to Qdrant
export { EmbeddingsQueries } from "./embeddings.queries";
export { IntegrationSettingsQueries } from "./integration-settings.queries";
export { IntegrationTemplatesQueries } from "./integration-templates.queries";
export { KnowledgeBaseDocumentsQueries } from "./knowledge-base-documents.queries";
export { KnowledgeBaseEntriesQueries } from "./knowledge-base-entries.queries";
export { NotificationsQueries } from "./notifications.queries";
export { OAuthConnectionsQueries } from "./oauth-connections.queries";
export { OrganizationSettingsQueries } from "./organization-settings.queries";
export { ProjectQueries } from "./projects.queries";
export { RecordingsQueries } from "./recordings.queries";
export { RedactionsQueries } from "./redactions.queries";
export { ReprocessingQueries } from "./reprocessing.queries";
export { SummaryHistoryQueries } from "./summary-history.queries";
export { TaskTagsQueries } from "./task-tags.queries";
export { TasksQueries } from "./tasks.queries";
export { UserDeletionRequestsQueries } from "./user-deletion-requests.queries";

