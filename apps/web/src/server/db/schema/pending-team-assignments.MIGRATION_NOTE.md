# Migration Required

This schema file defines the `pending_team_assignments` table, but the table does not exist in the database yet.

## To create the migration:

```bash
pnpm db:generate --name add_pending_team_assignments_table
```

## What this table does:

- Stores team assignments that should be applied when an invitation is accepted
- Allows multiple teams to be assigned during invitation (invitations table only supports single teamId)
- Automatically cleaned up when assignments are applied or invitation is cancelled

## Usage:

The `PendingTeamAssignmentsService.applyPendingAssignments()` function should be called when an invitation is accepted. This can be done via:
- A webhook handler for Better Auth invitation acceptance events
- A manual call in the invitation acceptance flow
- A scheduled job that processes pending assignments

