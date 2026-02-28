CREATE TABLE "bot_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"bot_enabled" boolean DEFAULT false NOT NULL,
	"auto_join_enabled" boolean DEFAULT false NOT NULL,
	"require_per_meeting_consent" boolean DEFAULT true NOT NULL,
	"bot_display_name" text DEFAULT 'Inovy Recording Bot' NOT NULL,
	"bot_join_message" text,
	"calendar_ids" text[],
	"inactivity_timeout_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_settings_user_id_org_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "calendar_event_id" text;--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "bot_status" text DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "joined_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "left_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "meeting_participants" text[];--> statement-breakpoint
CREATE INDEX "bot_settings_user_id_org_idx" ON "bot_settings" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "bot_settings_bot_enabled_org_idx" ON "bot_settings" USING btree ("bot_enabled","organization_id");--> statement-breakpoint
CREATE INDEX "bot_sessions_calendar_event_id_org_idx" ON "bot_sessions" USING btree ("calendar_event_id","organization_id");--> statement-breakpoint
CREATE INDEX "bot_sessions_bot_status_org_idx" ON "bot_sessions" USING btree ("bot_status","organization_id");--> statement-breakpoint
CREATE INDEX "bot_sessions_user_id_org_idx" ON "bot_sessions" USING btree ("user_id","organization_id");