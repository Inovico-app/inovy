#!/bin/bash
# Rollback script for Drizzle migration 0038_add_better_auth_schema
# Usage: ./rollback_migration.sh

echo "⚠️  WARNING: This will rollback migration 0038_add_better_auth_schema"
echo "This will DROP all Better Auth tables (user, session, account, organization, member, etc.)"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled."
    exit 1
fi

echo "Running rollback SQL..."
psql $DATABASE_URL -f src/server/db/migrations/rollback_0038.sql

if [ $? -eq 0 ]; then
    echo "✅ Rollback completed successfully!"
    echo "Note: You may also want to remove the migration file and journal entry manually."
else
    echo "❌ Rollback failed. Check the error above."
    exit 1
fi
