-- 1. Add category enum and column
CREATE TYPE "audit_category" AS ENUM ('mutation', 'read');
ALTER TABLE "audit_logs" ADD COLUMN "category" "audit_category" NOT NULL DEFAULT 'mutation';

-- 2. Convert eventType from enum to text
ALTER TABLE "audit_logs" ALTER COLUMN "event_type" TYPE text;
DROP TYPE IF EXISTS "audit_event_type";

-- 3. Convert resourceId from uuid to text
ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" TYPE text;

-- 4. Add new values to resource type enum
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'bot_session';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'bot_settings';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'bot_subscription';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'notification';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'team';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'auto_action';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'agenda';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'agenda_template';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'share_token';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'drive_watch';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'knowledge_base_document';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'project_template';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'redaction';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'privacy_request';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'data_export';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'invitation';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'calendar';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'audit_log';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'blob';

-- 5. Add new values to action enum
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'start';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'cancel';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'retry';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'subscribe';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'unsubscribe';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'complete';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'uncomplete';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'move';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'reprocess';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'upload';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'download';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'redact';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'invite';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'accept';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'reject';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'mark_read';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'generate';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'login';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'logout';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'verify';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'reset';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'list';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'get';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'search';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'detect';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'apply';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'check';

-- 6. Add indexes for category filtering
CREATE INDEX IF NOT EXISTS "audit_logs_category_idx" ON "audit_logs" ("category");
CREATE INDEX IF NOT EXISTS "audit_logs_org_category_idx" ON "audit_logs" ("organization_id", "category");
