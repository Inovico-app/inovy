CREATE TABLE "redactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"redaction_type" text DEFAULT 'pii' NOT NULL,
	"original_text" text NOT NULL,
	"redacted_text" text DEFAULT '[REDACTED]' NOT NULL,
	"start_time" integer,
	"end_time" integer,
	"start_index" integer,
	"end_index" integer,
	"detected_by" text DEFAULT 'automatic' NOT NULL,
	"redacted_by" text NOT NULL,
	"redacted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "redacted_transcription_text" text;--> statement-breakpoint
ALTER TABLE "redactions" ADD CONSTRAINT "redactions_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;