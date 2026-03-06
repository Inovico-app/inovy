CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid,
	"created_by_id" text NOT NULL,
	"calendar_event_id" text,
	"external_calendar_id" text,
	"title" text NOT NULL,
	"description" text,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"scheduled_end_at" timestamp with time zone,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"meeting_url" text,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"last_agenda_check_at" timestamp with time zone,
	"last_transcript_length" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_agenda_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"covered_at" timestamp with time zone,
	"ai_summary" text,
	"ai_key_points" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"created_by_id" text NOT NULL,
	"content" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_post_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_agenda_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_id" text,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_share_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"created_by_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"requires_auth" boolean DEFAULT true NOT NULL,
	"requires_org_membership" boolean DEFAULT true NOT NULL,
	"accessed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "meeting_id" uuid;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "meeting_id" uuid;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_notes" ADD CONSTRAINT "meeting_notes_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_post_actions" ADD CONSTRAINT "meeting_post_actions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_share_tokens" ADD CONSTRAINT "meeting_share_tokens_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meetings_organization_id_idx" ON "meetings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "meetings_calendar_event_id_idx" ON "meetings" USING btree ("calendar_event_id");--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "meetings_scheduled_start_idx" ON "meetings" USING btree ("organization_id","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "meeting_agenda_items_meeting_id_idx" ON "meeting_agenda_items" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_agenda_items_sort_idx" ON "meeting_agenda_items" USING btree ("meeting_id","sort_order");--> statement-breakpoint
CREATE INDEX "meeting_notes_meeting_id_idx" ON "meeting_notes" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_post_actions_meeting_id_idx" ON "meeting_post_actions" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_post_actions_status_idx" ON "meeting_post_actions" USING btree ("meeting_id","status");--> statement-breakpoint
CREATE INDEX "meeting_agenda_templates_org_idx" ON "meeting_agenda_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "meeting_agenda_templates_category_idx" ON "meeting_agenda_templates" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "meeting_share_tokens_meeting_id_idx" ON "meeting_share_tokens" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_share_tokens_token_hash_idx" ON "meeting_share_tokens" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bot_sessions_meeting_id_idx" ON "bot_sessions" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "recordings_meeting_id_idx" ON "recordings" USING btree ("meeting_id");