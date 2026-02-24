# Database Migration Notes

## Privileged Access Control Migration

**Date:** February 24, 2026
**Feature:** SSD-7.1.02 - Privileged Access Control
**Migration Name:** `add_privileged_access_audit_events`

### Schema Changes

#### Audit Event Types
Added new event types to `audit_event_type` enum:
- `admin_access` - Tracks admin interface access
- `superadmin_access` - Tracks superadmin interface access
- `privileged_action` - Tracks general privileged actions

#### Audit Resource Types
Added new resource type to `audit_resource_type` enum:
- `admin_interface` - Represents admin interface resources

### Migration Steps

1. **Generate Migration:**
   ```bash
   cd apps/web
   pnpm db:generate --name add_privileged_access_audit_events
   ```

2. **Review Migration:**
   Review the generated SQL migration file in `apps/web/src/server/db/migrations/`

3. **Apply Migration:**
   According to project guidelines, migrations are applied via GitHub Actions.
   DO NOT run `pnpm db:push` or `pnpm db:migrate` manually.

4. **Verify Migration:**
   After the GitHub Actions workflow completes:
   - Check that new event types are available
   - Verify audit logs can be created with new event types
   - Test privileged access dashboard functionality

### Rollback

If rollback is needed:
```bash
./rollback_migration.sh
```

### Testing

After migration is applied:
1. Test creating audit logs with new event types
2. Verify privileged access dashboard displays correctly
3. Test superadmin role assignment (logs `role_assigned` with new metadata)
4. Test admin access logging (logs `admin_access`)
5. Verify alerts are generated correctly

### Notes

- All existing audit logs remain unchanged
- New event types are backward compatible
- Audit log hash chain integrity is maintained
- No data migration required - only schema extension

### Related Files

- `apps/web/src/server/db/schema/audit-logs.ts` - Schema definition
- `apps/web/src/server/services/audit-log.service.ts` - Audit log service
- `apps/web/src/server/services/privileged-access.service.ts` - Privileged access service
- `apps/web/src/features/admin/actions/member-management.ts` - Role management actions
- `apps/web/src/features/admin/actions/superadmin-management.ts` - Superadmin management actions
