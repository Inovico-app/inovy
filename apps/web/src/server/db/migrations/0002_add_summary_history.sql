CREATE TABLE "summary_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"edited_by_id" text NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version_number" integer NOT NULL,
	"change_description" text
);
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "is_manually_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "last_edited_by_id" text;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "last_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "summary_history" ADD CONSTRAINT "summary_history_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;