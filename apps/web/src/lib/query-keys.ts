/**
 * Query key factory for centralized query key management
 * This ensures consistent query keys across the application and makes
 * cache invalidation easier to manage
 */

export const queryKeys = {
  recordings: {
    all: ["recordings"] as const,
    lists: () => [...queryKeys.recordings.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.recordings.lists(), filters] as const,
    details: () => [...queryKeys.recordings.all, "detail"] as const,
    detail: (recordingId: string) =>
      [...queryKeys.recordings.details(), recordingId] as const,
    status: (recordingId: string) =>
      [...queryKeys.recordings.all, "status", recordingId] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    lists: () => [...queryKeys.tasks.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.tasks.lists(), filters] as const,
    byRecording: (recordingId: string) =>
      [...queryKeys.tasks.all, "recording", recordingId] as const,
    userTasks: () => [...queryKeys.tasks.all, "user"] as const,
  },
  projects: {
    all: ["projects"] as const,
    lists: () => [...queryKeys.projects.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, "detail"] as const,
    detail: (projectId: string) =>
      [...queryKeys.projects.details(), projectId] as const,
    userProjects: () => [...queryKeys.projects.all, "user"] as const,
  },
  summaries: {
    all: ["summaries"] as const,
    details: () => [...queryKeys.summaries.all, "detail"] as const,
    detail: (recordingId: string) =>
      [...queryKeys.summaries.details(), recordingId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    lists: () => [...queryKeys.notifications.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.notifications.lists(), filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unread-count"] as const,
  },
  organization: {
    all: ["organization"] as const,
    members: (orgCode: string) =>
      [...queryKeys.organization.all, "members", orgCode] as const,
  },
} as const;

