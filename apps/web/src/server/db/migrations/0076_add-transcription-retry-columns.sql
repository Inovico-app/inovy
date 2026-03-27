ALTER TABLE "recordings" ADD COLUMN "transcription_retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "transcription_next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "transcription_last_error" text;