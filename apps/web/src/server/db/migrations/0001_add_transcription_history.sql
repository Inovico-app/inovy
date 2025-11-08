CREATE TABLE "transcription_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"content" text NOT NULL,
	"edited_sections" jsonb,
	"edited_by_id" text NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version_number" integer NOT NULL,
	"change_description" text
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "is_transcription_manually_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "transcription_last_edited_by_id" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "transcription_last_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transcription_history" ADD CONSTRAINT "transcription_history_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;