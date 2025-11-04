DO $$ BEGIN
 CREATE TYPE "public"."chat_audit_action" AS ENUM('access_granted', 'access_denied', 'query_executed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."chat_context" AS ENUM('project', 'organization');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"chat_context" "chat_context" NOT NULL,
	"project_id" text,
	"action" "chat_audit_action" NOT NULL,
	"query" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
