ALTER TABLE "recordings" ADD COLUMN "workflow_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "workflow_error" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "workflow_retry_count" integer DEFAULT 0 NOT NULL;