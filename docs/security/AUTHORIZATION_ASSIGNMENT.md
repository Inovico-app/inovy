# Authorization Assignment Procedures

**Document Version:** 1.0  
**Date:** 2026-02-24  
**Status:** Active  
**SSD Reference:** SSD-7.1.03 - Autorisaties

## Purpose

This document defines the procedures for assigning, modifying, and revoking user authorizations within the Inovy platform to ensure systematic and secure access control management.

## Scope

These procedures apply to:

- Initial role assignment for new users
- Role changes for existing users
- Organization membership management
- Invitation workflows
- Authorization revocation
- Emergency access procedures

## 1. User Onboarding and Initial Assignment

### 1.1 New Organization Creation

**Scenario:** First user creates a new organization

**Automatic Role Assignment:**
- User automatically assigned `owner` role
- Full administrative access to the organization
- Ability to invite and manage members

**Process:**

1. **User Registration**
   - User signs up via email/password, OAuth, or magic link
   - Email verification required (if email/password)
   - User profile created in database

2. **Organization Creation**
   - User creates first organization
   - Organization record created in database
   - User automatically added as organization owner

3. **Initial Setup**
   - Owner configures organization settings
   - Owner can invite additional members
   - Owner can create teams and projects

**Technical Implementation:**

```typescript
// Location: apps/web/src/features/auth/actions/create-organization.ts

export const createOrganizationAction = actionClient
  .schema(createOrganizationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const user = await getCurrentUser();
    
    // Create organization
    const org = await organizationService.create({
      name: parsedInput.name,
      slug: parsedInput.slug,
    });
    
    // Automatically assign creator as owner
    await organizationService.addMember({
      organizationId: org.id,
      userId: user.id,
      role: "owner", // Automatic owner role
    });
    
    return org;
  });
```

### 1.2 Organization Invitation

**Scenario:** Existing organization invites new member

**Process:**

1. **Invitation Creation**
   - Organization admin/owner initiates invitation
   - Specifies invitee email address
   - Selects role for new member
   - Optionally assigns to team(s)

2. **Invitation Email**
   - System sends invitation email to invitee
   - Email contains unique invitation link
   - Link expires after 7 days
   - Email uses approved template

3. **Invitation Acceptance**
   - Invitee clicks invitation link
   - Creates account (if new user)
   - Links account to organization
   - Role automatically assigned

4. **Role Assignment**
   - Role assigned as specified in invitation
   - Team memberships applied
   - Access granted immediately

**Technical Implementation:**

```typescript
// Location: apps/web/src/features/admin/actions/invite-member-to-organization.ts

export const inviteMemberAction = authorizedActionClient
  .metadata({
    actionName: "inviteMember",
    resource: "invitation",
    action: "create",
  })
  .schema(inviteMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Validate inviter has admin/owner role
    const inviter = await memberQueries.getMember(
      ctx.userId,
      ctx.organizationId
    );
    
    if (!isOrganizationAdmin(inviter.role)) {
      throw new Error("Insufficient permissions to invite members");
    }
    
    // Create invitation
    const invitation = await invitationService.createInvitation({
      organizationId: ctx.organizationId,
      email: parsedInput.email,
      role: parsedInput.role,
      teamId: parsedInput.teamId,
      inviterId: ctx.userId,
      expiresAt: addDays(new Date(), 7),
    });
    
    // Send invitation email
    await emailService.sendInvitationEmail({
      to: parsedInput.email,
      organizationName: ctx.organization.name,
      inviterName: inviter.name,
      invitationUrl: `${env.NEXT_PUBLIC_APP_URL}/accept-invitation/${invitation.id}`,
    });
    
    // Log action
    logger.security("Member invitation created", {
      inviterId: ctx.userId,
      inviteeEmail: parsedInput.email,
      role: parsedInput.role,
      organizationId: ctx.organizationId,
    });
    
    return invitation;
  });
```

### 1.3 Role Selection Guidelines

**Default Roles by User Type:**

| User Type | Recommended Role | Justification |
|-----------|------------------|---------------|
| Organization Creator | `owner` | Automatic - full control |
| Administrator | `admin` | Full management capabilities |
| Project Manager | `manager` | Limited admin for projects |
| Team Member | `user` | Standard access |
| External Stakeholder | `viewer` | Read-only access |
| Support Staff | `viewer` | Read-only for assistance |

**Selection Criteria:**

- **Principle of Least Privilege**: Assign minimum necessary role
- **Job Function**: Align role with responsibilities
- **Data Sensitivity**: Consider access to sensitive data
- **Regulatory Requirements**: Ensure compliance with AVG/GDPR
- **Temporary Access**: Use time-limited roles for contractors

## 2. Role Modification Procedures

### 2.1 Role Upgrade (Privilege Elevation)

**Scenario:** User needs higher privileges

**Authorization Requirements:**
- Requester must be organization admin or owner
- Change must be justified and documented
- Approval may be required for sensitive roles

**Process:**

1. **Change Request**
   - Document reason for role change
   - Identify new role requirements
   - Obtain necessary approvals

2. **Role Update**
   - Organization admin updates role in UI
   - System validates permission to change role
   - Change logged to audit trail

3. **Notification**
   - User notified of role change
   - Organization admins notified
   - Updated permissions take effect immediately

4. **Verification**
   - User verifies new access
   - Admin confirms change successful

**Technical Implementation:**

```typescript
// Location: apps/web/src/features/admin/actions/update-member-role.ts

export const updateMemberRoleAction = authorizedActionClient
  .metadata({
    actionName: "updateMemberRole",
    resource: "user",
    action: "update",
  })
  .schema(updateMemberRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { memberId, newRole } = parsedInput;
    
    // Validate requester is admin/owner
    const requester = await memberQueries.getMember(
      ctx.userId,
      ctx.organizationId
    );
    
    if (!isOrganizationAdmin(requester.role)) {
      throw new Error("Only admins can change member roles");
    }
    
    // Prevent owner role change (only one owner allowed)
    const member = await memberQueries.getMember(memberId, ctx.organizationId);
    if (member.role === "owner" && newRole !== "owner") {
      throw new Error("Cannot change owner role");
    }
    
    // Prevent setting owner role (ownership transfer requires special process)
    if (newRole === "owner") {
      throw new Error("Owner role requires ownership transfer process");
    }
    
    // Update role via Better Auth API
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: {
        memberId,
        role: newRole,
        organizationId: ctx.organizationId,
      },
    });
    
    // Log role change
    logger.security("Member role updated", {
      updatedBy: ctx.userId,
      memberId,
      oldRole: member.role,
      newRole,
      organizationId: ctx.organizationId,
      timestamp: new Date().toISOString(),
    });
    
    // Send notification to user
    await notificationService.create({
      userId: member.userId,
      type: "role_changed",
      title: "Your role has been updated",
      message: `Your role has been changed from ${member.role} to ${newRole}`,
    });
    
    return { success: true };
  });
```

### 2.2 Role Downgrade (Privilege Reduction)

**Scenario:** User no longer needs elevated privileges

**Authorization Requirements:**
- Requester must be organization admin or owner
- Self-demotion allowed (except for last owner)
- Change should be documented

**Process:**

1. **Change Initiation**
   - Admin or user initiates downgrade
   - Reason documented
   - Review existing access

2. **Role Update**
   - New role assigned
   - Permissions automatically reduced
   - Active sessions remain valid

3. **Access Verification**
   - User verifies reduced access
   - No access to previously available resources

**Special Cases:**

- **Last Owner**: Cannot be downgraded (must transfer ownership first)
- **Active Projects**: Check for project ownership before downgrade
- **Team Management**: Reassign team management if user is team owner

### 2.3 Ownership Transfer

**Scenario:** Transfer organization ownership to another member

**Authorization Requirements:**
- Only current owner can initiate transfer
- Target must be existing organization member
- Process requires explicit confirmation

**Process:**

1. **Transfer Initiation**
   - Current owner initiates transfer
   - Selects new owner from existing members
   - Confirms understanding of consequences

2. **Confirmation**
   - New owner receives transfer request
   - New owner must accept transfer
   - Both parties confirm in UI

3. **Transfer Execution**
   - Current owner role changed to `admin`
   - New owner role changed to `owner`
   - All permissions transferred
   - Transaction logged

4. **Notification**
   - All organization admins notified
   - Transfer recorded in audit log

**Technical Implementation:**

```typescript
// Location: apps/web/src/features/admin/actions/transfer-ownership.ts

export const transferOwnershipAction = authorizedActionClient
  .metadata({
    actionName: "transferOwnership",
    resource: "organization",
    action: "update",
  })
  .schema(transferOwnershipSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { newOwnerId } = parsedInput;
    
    // Validate current user is owner
    const currentOwner = await memberQueries.getMember(
      ctx.userId,
      ctx.organizationId
    );
    
    if (currentOwner.role !== "owner") {
      throw new Error("Only owner can transfer ownership");
    }
    
    // Validate new owner is existing member
    const newOwner = await memberQueries.getMember(
      newOwnerId,
      ctx.organizationId
    );
    
    if (!newOwner) {
      throw new Error("New owner must be existing organization member");
    }
    
    // Execute transfer (atomic transaction)
    await db.transaction(async (tx) => {
      // Downgrade current owner to admin
      await tx.update(members)
        .set({ role: "admin" })
        .where(and(
          eq(members.userId, ctx.userId),
          eq(members.organizationId, ctx.organizationId)
        ));
      
      // Upgrade new owner
      await tx.update(members)
        .set({ role: "owner" })
        .where(and(
          eq(members.userId, newOwnerId),
          eq(members.organizationId, ctx.organizationId)
        ));
    });
    
    // Log transfer
    logger.security("Ownership transferred", {
      previousOwnerId: ctx.userId,
      newOwnerId,
      organizationId: ctx.organizationId,
      timestamp: new Date().toISOString(),
    });
    
    // Notify all admins
    await notificationService.notifyAdmins(ctx.organizationId, {
      type: "ownership_transferred",
      title: "Organization ownership transferred",
      message: `Ownership transferred from ${currentOwner.name} to ${newOwner.name}`,
    });
    
    return { success: true };
  });
```

## 3. Member Management

### 3.1 Viewing Organization Members

**Who Can View:**
- All organization members can view member list
- Details visible based on role permissions

**Process:**

```typescript
// Location: apps/web/src/features/admin/actions/list-members.ts

export const listMembersAction = authorizedActionClient
  .metadata({
    actionName: "listMembers",
    resource: "user",
    action: "list",
  })
  .action(async ({ ctx }) => {
    // All members can view organization members
    const members = await memberQueries.listOrganizationMembers(
      ctx.organizationId
    );
    
    return members;
  });
```

### 3.2 Member Removal

**Who Can Remove:**
- Organization admins and owners
- Users can remove themselves (except last owner)

**Process:**

1. **Removal Initiation**
   - Admin initiates member removal
   - Confirms removal action
   - Documents reason (optional)

2. **Pre-Removal Checks**
   - Check if user is last owner (block removal)
   - Check for active projects/tasks (reassign if needed)
   - Check for team ownership (reassign if needed)

3. **Removal Execution**
   - Remove organization membership
   - Revoke all access to organization resources
   - Archive user's data (AVG compliance)
   - End active sessions

4. **Post-Removal Actions**
   - Send notification to removed user
   - Log removal in audit trail
   - Clean up user-specific caches

**Technical Implementation:**

```typescript
// Location: apps/web/src/features/admin/actions/remove-member.ts

export const removeMemberAction = authorizedActionClient
  .metadata({
    actionName: "removeMember",
    resource: "user",
    action: "delete",
  })
  .schema(removeMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { memberId } = parsedInput;
    
    // Validate requester is admin/owner (or removing self)
    const requester = await memberQueries.getMember(
      ctx.userId,
      ctx.organizationId
    );
    
    const isSelfRemoval = memberId === ctx.userId;
    const isAdmin = isOrganizationAdmin(requester.role);
    
    if (!isSelfRemoval && !isAdmin) {
      throw new Error("Insufficient permissions to remove members");
    }
    
    // Check if removing last owner
    const member = await memberQueries.getMember(memberId, ctx.organizationId);
    const ownerCount = await memberQueries.countOwners(ctx.organizationId);
    
    if (member.role === "owner" && ownerCount === 1) {
      throw new Error("Cannot remove last owner. Transfer ownership first.");
    }
    
    // Remove member via Better Auth API
    await auth.api.removeMember({
      headers: await headers(),
      body: {
        memberId,
        organizationId: ctx.organizationId,
      },
    });
    
    // Log removal
    logger.security("Member removed", {
      removedBy: ctx.userId,
      memberId,
      memberRole: member.role,
      organizationId: ctx.organizationId,
      selfRemoval: isSelfRemoval,
    });
    
    // Send notification
    await notificationService.create({
      userId: member.userId,
      type: "removed_from_organization",
      title: "Removed from organization",
      message: `You have been removed from ${ctx.organization.name}`,
    });
    
    // Invalidate caches
    await cacheService.invalidateUserCache(member.userId);
    await cacheService.invalidateOrganizationCache(ctx.organizationId);
    
    return { success: true };
  });
```

### 3.3 Pending Invitations

**Management:**
- View pending invitations
- Resend invitation email
- Cancel pending invitation

**Who Can Manage:**
- Organization admins and owners

**Process:**

```typescript
// View pending invitations
export const listPendingInvitationsAction = authorizedActionClient
  .metadata({
    actionName: "listPendingInvitations",
    resource: "invitation",
    action: "list",
  })
  .action(async ({ ctx }) => {
    const invitations = await invitationQueries.getPendingInvitations(
      ctx.organizationId
    );
    
    return invitations;
  });

// Cancel invitation
export const cancelInvitationAction = authorizedActionClient
  .metadata({
    actionName: "cancelInvitation",
    resource: "invitation",
    action: "cancel",
  })
  .schema(z.object({ invitationId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await invitationService.cancelInvitation(
      parsedInput.invitationId,
      ctx.organizationId
    );
    
    logger.security("Invitation cancelled", {
      cancelledBy: ctx.userId,
      invitationId: parsedInput.invitationId,
      organizationId: ctx.organizationId,
    });
    
    return { success: true };
  });
```

## 4. Emergency Procedures

### 4.1 Emergency Access Grant

**Scenario:** Critical situation requiring immediate elevated access

**Authorization:**
- Requires superadmin intervention
- Must be documented and justified
- Temporary access only

**Process:**

1. **Emergency Declaration**
   - Incident commander requests emergency access
   - Documents critical business need
   - Specifies required access level and duration

2. **Superadmin Approval**
   - Superadmin reviews request
   - Validates emergency situation
   - Grants temporary elevated access

3. **Access Grant**
   - Temporary role assigned
   - Expiration time set
   - All actions logged with emergency flag

4. **Post-Emergency Review**
   - Review all actions taken
   - Document justification
   - Revoke temporary access
   - Incident report created

### 4.2 Emergency Access Revocation

**Scenario:** User account compromised or malicious activity detected

**Authorization:**
- Superadmin or security team
- Immediate action without approval in security incidents

**Process:**

1. **Threat Detection**
   - Suspicious activity detected
   - Security alert triggered
   - Incident response activated

2. **Immediate Revocation**
   - All sessions terminated
   - Access completely revoked
   - Account locked pending investigation

3. **Investigation**
   - Review audit logs
   - Assess damage
   - Identify affected resources

4. **Remediation**
   - Reset credentials
   - Restore appropriate access
   - Implement additional security measures

**Technical Implementation:**

```typescript
// Location: apps/web/src/features/admin/actions/emergency-revoke-access.ts

export const emergencyRevokeAccessAction = superadminActionClient
  .metadata({
    actionName: "emergencyRevokeAccess",
    resource: "user",
    action: "delete",
  })
  .schema(emergencyRevokeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, reason } = parsedInput;
    
    // Terminate all sessions
    await auth.api.revokeUserSessions({
      headers: await headers(),
      body: { userId },
    });
    
    // Lock account
    await userService.lockAccount(userId, reason);
    
    // Log emergency action
    logger.security("EMERGENCY ACCESS REVOCATION", {
      revokedBy: ctx.userId,
      targetUserId: userId,
      reason,
      timestamp: new Date().toISOString(),
      severity: "CRITICAL",
    });
    
    // Alert security team
    await alertService.sendSecurityAlert({
      type: "emergency_access_revocation",
      userId,
      reason,
      revokedBy: ctx.userId,
    });
    
    return { success: true };
  });
```

## 5. Superadmin Role Management

### 5.1 Superadmin Assignment

**Authorization:**
- Restricted to platform administrators
- Requires executive approval
- Must be documented

**Process:**

1. **Request and Approval**
   - Written request submitted
   - Business justification provided
   - CTO/Security Officer approval required

2. **Background Check**
   - Verify employee status
   - Check security clearance
   - Review access history

3. **Assignment**
   - Manually assign superadmin role
   - Document in secure registry
   - Issue security guidelines

4. **Training**
   - Complete superadmin training
   - Review security protocols
   - Acknowledge responsibilities

### 5.2 Superadmin Restrictions

**Limitations:**
- No superadmin access to production without approval
- All superadmin actions logged
- Regular access reviews (monthly)
- MFA required for superadmin accounts

## 6. Audit and Compliance

### 6.1 Authorization Audit Trail

**Logged Events:**
- Role assignments
- Role changes
- Permission checks (failed attempts)
- Member additions/removals
- Invitation creation/acceptance
- Emergency access grants/revocations

**Log Format:**

```typescript
{
  timestamp: "2026-02-24T10:30:00Z",
  event: "role_changed",
  actor: {
    userId: "user_123",
    role: "admin",
    organizationId: "org_456"
  },
  subject: {
    userId: "user_789",
    oldRole: "user",
    newRole: "manager"
  },
  metadata: {
    reason: "Promoted to project manager",
    approvedBy: "user_123"
  }
}
```

### 6.2 Compliance Reporting

**Monthly Reports:**
- New role assignments
- Role changes
- Member additions/removals
- Failed authorization attempts
- Emergency access events

**Annual Reports:**
- Complete authorization review
- Compliance verification
- Security incidents
- Policy updates

## 7. User Interface

### 7.1 Member Management UI

**Location:** `/workspace/apps/web/src/app/(main)/admin/members`

**Features:**
- View organization members
- Invite new members
- Change member roles
- Remove members
- View pending invitations
- Cancel invitations

### 7.2 Role Selection UI

**Components:**
- Role dropdown with descriptions
- Permission preview
- Confirmation dialog for sensitive changes
- Audit log display

## 8. References

### 8.1 Related Documentation

- [Authorization Process](./AUTHORIZATION_PROCESS.md)
- [Authorization Configuration](./AUTHORIZATION_CONFIGURATION.md)
- [Technical Implementation Guide](/workspace/apps/web/src/lib/README.md)

### 8.2 Code References

- Member Management Actions: `/workspace/apps/web/src/features/admin/actions/member-management.ts`
- Invitation Service: `/workspace/apps/web/src/server/services/invitation.service.ts`
- Member Queries: `/workspace/apps/web/src/server/data-access/organization.queries.ts`

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-24 | Development Team | Initial version for SSD-7.1.03 compliance |

**Review Schedule:**
- Next review: 2026-05-24 (quarterly)
- Annual review: 2027-02-24

**Document Owner:** Security & Compliance Team  
**Approvers:** CTO, Security Officer, Compliance Officer

---

*This document satisfies SSD-7.1.03: "Er bestaat een proces voor het definiëren, toekennen en onderhouden van de autorisaties"*
