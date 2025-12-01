/**
 * Data Transfer Objects for Team operations
 */

export interface TeamDto {
  id: string;
  departmentId: string | null;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamDto {
  departmentId?: string | null;
  organizationId: string;
  name: string;
  description?: string | null;
}

export interface UpdateTeamDto {
  departmentId?: string | null;
  name?: string;
  description?: string | null;
}

export interface UserTeamRoleDto {
  userId: string;
  teamId: string;
  role: "member" | "lead" | "admin";
  joinedAt: Date;
}

export interface TeamWithMembersDto extends TeamDto {
  members?: Array<{
    userId: string;
    role: "member" | "lead" | "admin";
    joinedAt: Date;
  }>;
}

export interface TeamMemberWithUserDto {
  id: string;
  userId: string;
  teamId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  createdAt: Date | null;
}

