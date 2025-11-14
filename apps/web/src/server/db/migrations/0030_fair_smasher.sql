ALTER TABLE "recordings" ADD COLUMN "is_encrypted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "encryption_metadata" text;