/**
 * Authorization Groups for RBAC System
 * SSD-7.1.01: Organize access rights in manageable authorization groups
 *
 * This module defines logical authorization groups that organize permissions
 * into functional areas for better manageability and maintainability.
 */

import type { Permissions } from "./permissions";

/**
 * Authorization Group Definition
 * Groups related permissions together for a specific functional area
 */
export interface AuthorizationGroup {
  /**
   * Unique identifier for the authorization group
   */
  readonly id: string;

  /**
   * Human-readable name of the authorization group
   */
  readonly name: string;

  /**
   * Description of what this authorization group controls
   */
  readonly description: string;

  /**
   * Permissions included in this authorization group
   */
  readonly permissions: Readonly<Record<string, readonly string[]>>;

  /**
   * Category for organizing groups
   */
  readonly category: AuthorizationGroupCategory;
}

/**
 * Authorization Group Categories
 * High-level categories for organizing authorization groups
 */
export const AuthorizationGroupCategories = {
  CONTENT: "Content Management",
  USER: "User Management",
  ORGANIZATION: "Organization Administration",
  SYSTEM: "System Administration",
  INTEGRATION: "Integration Management",
  COMMUNICATION: "Communication",
  AUDIT: "Audit & Compliance",
} as const;

export type AuthorizationGroupCategory =
  (typeof AuthorizationGroupCategories)[keyof typeof AuthorizationGroupCategories];

/**
 * Authorization Groups
 * Defines all authorization groups in the system
 */
export const AuthorizationGroups = {
  /**
   * Content Management Groups
   */
  CONTENT_MANAGEMENT: {
    PROJECT_FULL: {
      id: "content.project.full",
      name: "Project Full Access",
      description:
        "Full access to create, read, update, and delete projects. Allows complete project lifecycle management.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        project: ["create", "read", "update", "delete"],
      },
    },
    PROJECT_EDITOR: {
      id: "content.project.editor",
      name: "Project Editor",
      description:
        "Create, read, and update projects without deletion rights. Suitable for project contributors.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        project: ["create", "read", "update"],
      },
    },
    PROJECT_VIEWER: {
      id: "content.project.viewer",
      name: "Project Viewer",
      description: "Read-only access to projects. View project information without modification rights.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        project: ["read"],
      },
    },
    RECORDING_FULL: {
      id: "content.recording.full",
      name: "Recording Full Access",
      description:
        "Full access to create, read, update, and delete recordings. Complete recording management capabilities.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        recording: ["create", "read", "update", "delete"],
      },
    },
    RECORDING_EDITOR: {
      id: "content.recording.editor",
      name: "Recording Editor",
      description:
        "Create, read, and update recordings without deletion rights. Suitable for recording contributors.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        recording: ["create", "read", "update"],
      },
    },
    RECORDING_VIEWER: {
      id: "content.recording.viewer",
      name: "Recording Viewer",
      description: "Read-only access to recordings. View recording information without modification rights.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        recording: ["read"],
      },
    },
    TASK_FULL: {
      id: "content.task.full",
      name: "Task Full Access",
      description:
        "Full access to create, read, update, and delete tasks. Complete task management capabilities.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        task: ["create", "read", "update", "delete"],
      },
    },
    TASK_EDITOR: {
      id: "content.task.editor",
      name: "Task Editor",
      description:
        "Create, read, and update tasks without deletion rights. Suitable for task contributors.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        task: ["create", "read", "update"],
      },
    },
    TASK_VIEWER: {
      id: "content.task.viewer",
      name: "Task Viewer",
      description: "Read-only access to tasks. View task information without modification rights.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        task: ["read"],
      },
    },
    CONTENT_FULL_ACCESS: {
      id: "content.full",
      name: "Content Full Access",
      description:
        "Complete access to all content resources (projects, recordings, tasks). Combines all content management permissions.",
      category: AuthorizationGroupCategories.CONTENT,
      permissions: {
        project: ["create", "read", "update", "delete"],
        recording: ["create", "read", "update", "delete"],
        task: ["create", "read", "update", "delete"],
      },
    },
  },

  /**
   * User Management Groups
   */
  USER_MANAGEMENT: {
    USER_FULL: {
      id: "user.full",
      name: "User Full Access",
      description:
        "Full access to create, read, update, and delete users. Complete user account management.",
      category: AuthorizationGroupCategories.USER,
      permissions: {
        user: ["create", "read", "update", "delete"],
      },
    },
    USER_ADMIN: {
      id: "user.admin",
      name: "User Administrator",
      description:
        "Administrative access to user accounts including modifications. Can manage user lifecycle.",
      category: AuthorizationGroupCategories.USER,
      permissions: {
        user: ["read", "update", "delete"],
      },
    },
    USER_VIEWER: {
      id: "user.viewer",
      name: "User Viewer",
      description: "Read-only access to user information. Can view user profiles and details.",
      category: AuthorizationGroupCategories.USER,
      permissions: {
        user: ["read"],
      },
    },
    INVITATION_MANAGER: {
      id: "user.invitation",
      name: "Invitation Manager",
      description:
        "Manage user invitations. Can create and cancel invitations to the organization.",
      category: AuthorizationGroupCategories.USER,
      permissions: {
        invitation: ["create", "cancel"],
      },
    },
  },

  /**
   * Organization Administration Groups
   */
  ORGANIZATION_ADMIN: {
    ORG_FULL: {
      id: "org.full",
      name: "Organization Full Access",
      description:
        "Complete access to organization settings, teams, and configuration. Full organizational control.",
      category: AuthorizationGroupCategories.ORGANIZATION,
      permissions: {
        organization: ["create", "list", "read", "update", "delete"],
        team: ["create", "read", "update", "delete"],
        setting: ["read", "update"],
      },
    },
    ORG_SETTINGS_MANAGER: {
      id: "org.settings",
      name: "Organization Settings Manager",
      description:
        "Manage organization settings and configuration. Can update organizational preferences.",
      category: AuthorizationGroupCategories.ORGANIZATION,
      permissions: {
        organization: ["read", "update"],
        setting: ["read", "update"],
      },
    },
    TEAM_MANAGER: {
      id: "org.team_manager",
      name: "Team Manager",
      description:
        "Full team management capabilities. Can create, modify, and manage teams within the organization.",
      category: AuthorizationGroupCategories.ORGANIZATION,
      permissions: {
        team: ["create", "read", "update", "delete"],
      },
    },
    TEAM_VIEWER: {
      id: "org.team_viewer",
      name: "Team Viewer",
      description: "Read-only access to team information. View team structure and membership.",
      category: AuthorizationGroupCategories.ORGANIZATION,
      permissions: {
        team: ["read"],
      },
    },
    ORG_INSTRUCTION_WRITER: {
      id: "org.instruction_writer",
      name: "Organization Instruction Writer",
      description:
        "Create and modify organization instructions. Manage organizational knowledge base content.",
      category: AuthorizationGroupCategories.ORGANIZATION,
      permissions: {
        orgInstruction: ["read", "write"],
      },
    },
    ORG_INSTRUCTION_READER: {
      id: "org.instruction_reader",
      name: "Organization Instruction Reader",
      description: "Read-only access to organization instructions. View organizational guidelines.",
      category: AuthorizationGroupCategories.ORGANIZATION,
      permissions: {
        orgInstruction: ["read"],
      },
    },
  },

  /**
   * System Administration Groups
   */
  SYSTEM_ADMIN: {
    SUPERADMIN_FULL: {
      id: "system.superadmin",
      name: "Super Administrator",
      description:
        "Ultimate system access. Can perform all operations across all organizations. Reserved for system administrators.",
      category: AuthorizationGroupCategories.SYSTEM,
      permissions: {
        superadmin: ["all"],
        admin: ["all"],
      },
    },
    ADMIN_FULL: {
      id: "system.admin",
      name: "Administrator",
      description:
        "Full administrative access within organization scope. Can manage all aspects of the organization.",
      category: AuthorizationGroupCategories.SYSTEM,
      permissions: {
        admin: ["all"],
      },
    },
    AUDIT_LOG_READER: {
      id: "system.audit_reader",
      name: "Audit Log Reader",
      description:
        "Read access to audit logs. Can view system activity logs for compliance and security monitoring.",
      category: AuthorizationGroupCategories.AUDIT,
      permissions: {
        "audit-log": ["read"],
      },
    },
  },

  /**
   * Integration Management Groups
   */
  INTEGRATION_ADMIN: {
    INTEGRATION_FULL: {
      id: "integration.full",
      name: "Integration Administrator",
      description:
        "Full integration management capabilities. Can configure and manage all third-party integrations.",
      category: AuthorizationGroupCategories.INTEGRATION,
      permissions: {
        integration: ["manage"],
        deepgram: ["token"],
      },
    },
    INTEGRATION_MANAGER: {
      id: "integration.manager",
      name: "Integration Manager",
      description: "Manage third-party integrations. Configure integration settings without system-level access.",
      category: AuthorizationGroupCategories.INTEGRATION,
      permissions: {
        integration: ["manage"],
      },
    },
    DEEPGRAM_ACCESS: {
      id: "integration.deepgram",
      name: "Deepgram Access",
      description:
        "Access to Deepgram tokens and services. Required for speech-to-text operations.",
      category: AuthorizationGroupCategories.INTEGRATION,
      permissions: {
        deepgram: ["token"],
      },
    },
  },

  /**
   * Communication Groups
   */
  COMMUNICATION: {
    CHAT_PROJECT: {
      id: "communication.chat_project",
      name: "Project Chat Access",
      description: "Access to project-level chat features. Can communicate within project scope.",
      category: AuthorizationGroupCategories.COMMUNICATION,
      permissions: {
        chat: ["project"],
      },
    },
    CHAT_ORGANIZATION: {
      id: "communication.chat_org",
      name: "Organization Chat Access",
      description: "Access to organization-wide chat features. Can communicate across the organization.",
      category: AuthorizationGroupCategories.COMMUNICATION,
      permissions: {
        chat: ["organization"],
      },
    },
    CHAT_FULL: {
      id: "communication.chat_full",
      name: "Full Chat Access",
      description:
        "Complete access to all chat features. Can use both project and organization-level communication.",
      category: AuthorizationGroupCategories.COMMUNICATION,
      permissions: {
        chat: ["project", "organization"],
      },
    },
  },

  /**
   * Onboarding Groups
   */
  ONBOARDING: {
    ONBOARDING_FULL: {
      id: "onboarding.full",
      name: "Onboarding Full Access",
      description:
        "Complete onboarding management. Can create, read, update, and complete onboarding processes.",
      category: AuthorizationGroupCategories.ORGANIZATION,
      permissions: {
        onboarding: ["create", "read", "update", "complete"],
      },
    },
  },
} as const;

/**
 * Role-based authorization group assignments
 * Maps each role to their assigned authorization groups
 */
export const RoleAuthorizationGroups = {
  /**
   * Super Administrator
   * Has access to all authorization groups including system-level operations
   */
  superadmin: [
    // System Administration
    AuthorizationGroups.SYSTEM_ADMIN.SUPERADMIN_FULL,
    AuthorizationGroups.SYSTEM_ADMIN.ADMIN_FULL,
    AuthorizationGroups.SYSTEM_ADMIN.AUDIT_LOG_READER,

    // Organization Administration
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_FULL,
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_INSTRUCTION_WRITER,

    // Content Management
    AuthorizationGroups.CONTENT_MANAGEMENT.CONTENT_FULL_ACCESS,

    // User Management
    AuthorizationGroups.USER_MANAGEMENT.USER_FULL,
    AuthorizationGroups.USER_MANAGEMENT.INVITATION_MANAGER,

    // Integration Management
    AuthorizationGroups.INTEGRATION_ADMIN.INTEGRATION_FULL,

    // Communication
    AuthorizationGroups.COMMUNICATION.CHAT_FULL,

    // Onboarding
    AuthorizationGroups.ONBOARDING.ONBOARDING_FULL,
  ],

  /**
   * Administrator
   * Has full access within organization scope (no cross-organization access)
   */
  admin: [
    // System Administration (org-scoped)
    AuthorizationGroups.SYSTEM_ADMIN.ADMIN_FULL,
    AuthorizationGroups.SYSTEM_ADMIN.AUDIT_LOG_READER,

    // Organization Administration
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_FULL,
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_INSTRUCTION_WRITER,

    // Content Management
    AuthorizationGroups.CONTENT_MANAGEMENT.CONTENT_FULL_ACCESS,

    // User Management
    AuthorizationGroups.USER_MANAGEMENT.USER_FULL,
    AuthorizationGroups.USER_MANAGEMENT.INVITATION_MANAGER,

    // Integration Management
    AuthorizationGroups.INTEGRATION_ADMIN.INTEGRATION_MANAGER,

    // Communication
    AuthorizationGroups.COMMUNICATION.CHAT_FULL,

    // Onboarding
    AuthorizationGroups.ONBOARDING.ONBOARDING_FULL,
  ],

  /**
   * Owner
   * Same as admin - organization owner with full administrative rights
   */
  owner: [
    // System Administration (org-scoped)
    AuthorizationGroups.SYSTEM_ADMIN.ADMIN_FULL,
    AuthorizationGroups.SYSTEM_ADMIN.AUDIT_LOG_READER,

    // Organization Administration
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_FULL,
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_INSTRUCTION_WRITER,

    // Content Management
    AuthorizationGroups.CONTENT_MANAGEMENT.CONTENT_FULL_ACCESS,

    // User Management
    AuthorizationGroups.USER_MANAGEMENT.USER_FULL,
    AuthorizationGroups.USER_MANAGEMENT.INVITATION_MANAGER,

    // Integration Management
    AuthorizationGroups.INTEGRATION_ADMIN.INTEGRATION_MANAGER,

    // Communication
    AuthorizationGroups.COMMUNICATION.CHAT_FULL,

    // Onboarding
    AuthorizationGroups.ONBOARDING.ONBOARDING_FULL,
  ],

  /**
   * Manager
   * Limited administrative rights focused on content and team management
   */
  manager: [
    // Organization Administration (limited)
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_SETTINGS_MANAGER,
    AuthorizationGroups.ORGANIZATION_ADMIN.TEAM_VIEWER,
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_INSTRUCTION_READER,

    // Content Management
    AuthorizationGroups.CONTENT_MANAGEMENT.CONTENT_FULL_ACCESS,

    // User Management (limited)
    AuthorizationGroups.USER_MANAGEMENT.USER_VIEWER,
    AuthorizationGroups.USER_MANAGEMENT.INVITATION_MANAGER,

    // Integration Management
    AuthorizationGroups.INTEGRATION_ADMIN.INTEGRATION_MANAGER,

    // Communication (project-only)
    AuthorizationGroups.COMMUNICATION.CHAT_PROJECT,

    // Onboarding
    AuthorizationGroups.ONBOARDING.ONBOARDING_FULL,
  ],

  /**
   * User
   * Standard user with content editing capabilities
   */
  user: [
    // Content Management (no delete)
    AuthorizationGroups.CONTENT_MANAGEMENT.PROJECT_EDITOR,
    AuthorizationGroups.CONTENT_MANAGEMENT.RECORDING_EDITOR,
    AuthorizationGroups.CONTENT_MANAGEMENT.TASK_EDITOR,

    // User Management (self-view only)
    AuthorizationGroups.USER_MANAGEMENT.USER_VIEWER,

    // Organization (view only)
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_INSTRUCTION_READER,
    AuthorizationGroups.ORGANIZATION_ADMIN.TEAM_VIEWER,

    // Communication (project-only)
    AuthorizationGroups.COMMUNICATION.CHAT_PROJECT,

    // Onboarding
    AuthorizationGroups.ONBOARDING.ONBOARDING_FULL,
  ],

  /**
   * Viewer
   * Read-only access across the system
   */
  viewer: [
    // Content Management (read-only)
    AuthorizationGroups.CONTENT_MANAGEMENT.PROJECT_VIEWER,
    AuthorizationGroups.CONTENT_MANAGEMENT.RECORDING_VIEWER,
    AuthorizationGroups.CONTENT_MANAGEMENT.TASK_VIEWER,

    // User Management (view only)
    AuthorizationGroups.USER_MANAGEMENT.USER_VIEWER,

    // Organization (view only)
    AuthorizationGroups.ORGANIZATION_ADMIN.ORG_INSTRUCTION_READER,
    AuthorizationGroups.ORGANIZATION_ADMIN.TEAM_VIEWER,

    // Communication (project-only)
    AuthorizationGroups.COMMUNICATION.CHAT_PROJECT,
  ],
} as const;

/**
 * Get all authorization groups assigned to a role
 */
export function getAuthorizationGroupsForRole(
  role: keyof typeof RoleAuthorizationGroups
): AuthorizationGroup[] {
  return [...(RoleAuthorizationGroups[role] ?? [])];
}

/**
 * Get all permissions for a role by combining all authorization groups
 */
export function getPermissionsForRole(
  role: keyof typeof RoleAuthorizationGroups
): Permissions {
  const groups = getAuthorizationGroupsForRole(role);

  const combinedPermissions: Permissions = {};

  for (const group of groups) {
    for (const [resource, actions] of Object.entries(group.permissions)) {
      if (!combinedPermissions[resource as keyof Permissions]) {
        combinedPermissions[resource as keyof Permissions] = [
          ...(actions as string[]),
        ] as never;
      } else {
        const existing = combinedPermissions[resource as keyof Permissions];
        const uniqueActions = new Set([
          ...(existing ?? []),
          ...(actions as string[]),
        ]);
        combinedPermissions[resource as keyof Permissions] = Array.from(
          uniqueActions
        ) as never;
      }
    }
  }

  return combinedPermissions;
}

/**
 * Check if a role has a specific authorization group
 */
export function roleHasAuthorizationGroup(
  role: keyof typeof RoleAuthorizationGroups,
  groupId: string
): boolean {
  const groups = getAuthorizationGroupsForRole(role);
  return groups.some((group) => group.id === groupId);
}

/**
 * Get all authorization groups organized by category
 */
export function getAuthorizationGroupsByCategory(): Record<
  AuthorizationGroupCategory,
  AuthorizationGroup[]
> {
  const groupsByCategory: Record<string, AuthorizationGroup[]> = {};

  for (const category of Object.values(AuthorizationGroupCategories)) {
    groupsByCategory[category] = [];
  }

  for (const categoryGroups of Object.values(AuthorizationGroups)) {
    for (const group of Object.values(categoryGroups)) {
      groupsByCategory[group.category].push(group);
    }
  }

  return groupsByCategory as Record<AuthorizationGroupCategory, AuthorizationGroup[]>;
}

/**
 * Authorization group hierarchy levels
 */
export const AuthorizationLevels = {
  FULL_ACCESS: "Full access to all operations (create, read, update, delete)",
  EDITOR: "Can create, read, and update but not delete",
  VIEWER: "Read-only access",
  MANAGER: "Administrative access for management operations",
  NONE: "No access",
} as const;

export type AuthorizationLevel =
  (typeof AuthorizationLevels)[keyof typeof AuthorizationLevels];

/**
 * Type exports
 */
export type RoleName = keyof typeof RoleAuthorizationGroups;
