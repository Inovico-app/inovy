import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  invitations,
  organizations,
  users,
  type OrganizationMemberRole,
} from "../db/schema/auth";
import { pendingTeamAssignments } from "../db/schema/pending-team-assignments";

/**
 * Invitation details with related data
 */
export interface InvitationDetails {
  id: string;
  email: string;
  role: OrganizationMemberRole;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  organization: {
    id: string;
    name: string;
  };
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
  pendingTeamIds: string[];
}

/**
 * Database queries for invitation operations
 * Pure data access layer - no business logic
 */
export class InvitationsQueries {
  /**
   * Get invitation by ID with organization and inviter details
   * Also fetches pending team assignments for the invitation
   */
  static async getInvitationById(
    invitationId: string
  ): Promise<InvitationDetails | null> {
    // Get invitation with organization and inviter details
    const invitationData = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        organizationId: invitations.organizationId,
        organizationName: organizations.name,
        inviterId: invitations.inviterId,
        inviterName: users.name,
        inviterEmail: users.email,
      })
      .from(invitations)
      .innerJoin(
        organizations,
        eq(invitations.organizationId, organizations.id)
      )
      .innerJoin(users, eq(invitations.inviterId, users.id))
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitationData || invitationData.length === 0) {
      return null;
    }

    const invitation = invitationData[0];

    // Get pending team assignments
    const pendingAssignments = await db
      .select({ teamId: pendingTeamAssignments.teamId })
      .from(pendingTeamAssignments)
      .where(eq(pendingTeamAssignments.invitationId, invitationId));

    const pendingTeamIds = pendingAssignments.map((a) => a.teamId);

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organization: {
        id: invitation.organizationId,
        name: invitation.organizationName,
      },
      inviter: {
        id: invitation.inviterId,
        name: invitation.inviterName,
        email: invitation.inviterEmail,
      },
      pendingTeamIds,
    };
  }
}

