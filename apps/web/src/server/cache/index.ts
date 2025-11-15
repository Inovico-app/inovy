/**
 * Cached query exports
 * Centralized location for all Next.js cached queries
 */

export {
  getCachedAutoActionStats,
  getCachedRecentAutoActions,
} from "./auto-actions.cache";
export {
  getCachedConversationHistory,
  getCachedConversations,
} from "./chat.cache";
export { getCachedDashboardOverview } from "./dashboard.cache";
export {
  getCachedSummaryHistory,
  getCachedTranscriptionHistory,
} from "./history.cache";
export {
  getCachedNotifications,
  getCachedUnreadCount,
} from "./notification.cache";
export {
  getCachedOrganizationUsers,
  getCachedOrganizationInstructions,
} from "./organization.cache";
export { getCachedOrganizationSettings } from "./organization-settings.cache";
export {
  getCachedProjectByIdWithCreator,
  getCachedUserProjects,
} from "./project.cache";
export { getCachedDriveWatches } from "./drive-watch.cache";
export {
  getCachedRecordingById,
  getCachedRecordingsByProjectId,
} from "./recording.cache";
export {
  getCachedSummary,
  type SummaryContent,
  type SummaryResult,
} from "./summary.cache";
export {
  getCachedTagsByOrganization,
  getCachedTaskTags,
} from "./task-tags.cache";
export { getCachedTasksByUser, getCachedTaskStats } from "./task.cache";
export {
  getCachedKnowledgeEntries,
  getCachedKnowledgeDocuments,
  getCachedHierarchicalKnowledge,
} from "./knowledge-base.cache";
export {
  getCachedDepartmentsByOrganization,
  getCachedDepartmentById,
} from "./department.cache";
export {
  getCachedTeamsByOrganization,
  getCachedTeamsByDepartment,
  getCachedTeamById,
  getCachedUserTeams,
} from "./team.cache";

