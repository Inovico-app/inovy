export interface ToolContext {
  organizationId: string;
  userId: string;
  projectId?: string;
  chatContext: "project" | "organization";
  userRole: string;
  conversationId?: string;
  teamId?: string | null;
  userTeamIds?: string[];
}
