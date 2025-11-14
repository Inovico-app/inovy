CREATE TYPE "public"."audit_action" AS ENUM('create', 'read', 'update', 'delete', 'export', 'import', 'archive', 'restore', 'grant', 'revoke', 'assign', 'unassign', 'connect', 'disconnect', 'sync');--> statement-breakpoint
CREATE TYPE "public"."audit_event_type" AS ENUM('recording_viewed', 'recording_downloaded', 'recording_streamed', 'recording_uploaded', 'recording_deleted', 'recording_archived', 'recording_restored', 'task_created', 'task_updated', 'task_deleted', 'task_assigned', 'task_completed', 'task_uncompleted', 'user_login', 'user_logout', 'user_created', 'user_updated', 'user_deleted', 'user_deactivated', 'user_activated', 'permission_granted', 'permission_revoked', 'permission_updated', 'role_assigned', 'role_removed', 'export_created', 'export_downloaded', 'audit_log_exported', 'integration_connected', 'integration_disconnected', 'integration_synced', 'project_created', 'project_updated', 'project_deleted', 'project_archived', 'settings_updated', 'organization_updated');--> statement-breakpoint
CREATE TYPE "public"."audit_resource_type" AS ENUM('recording', 'task', 'user', 'project', 'organization', 'permission', 'role', 'export', 'integration', 'settings', 'consent', 'knowledge_base', 'chat');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "audit_event_type" NOT NULL,
	"resource_type" "audit_resource_type" NOT NULL,
	"resource_id" uuid,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"previous_hash" text,
	"hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
