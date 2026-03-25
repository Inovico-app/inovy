ALTER TABLE "recordings" ALTER COLUMN "file_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ALTER COLUMN "file_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ALTER COLUMN "file_size" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ALTER COLUMN "file_mime_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "storage_status" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "recall_bot_id" text;