ALTER TABLE "organizations" ADD COLUMN "scheduled_deletion_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "deletion_requested_by_id" text;