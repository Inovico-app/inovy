CREATE TABLE "bot_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid,
	"project_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"recall_bot_id" text NOT NULL,
	UNIQUE ("recall_bot_id"),
	"recall_status" text NOT NULL,
	"meeting_url" text NOT NULL,
	"meeting_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "bot_sessions_recording_id_idx" ON "bot_sessions" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "bot_sessions_project_id_idx" ON "bot_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "bot_sessions_organization_id_idx" ON "bot_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bot_sessions_recall_bot_id_idx" ON "bot_sessions" USING btree ("recall_bot_id");--> statement-breakpoint

§ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;