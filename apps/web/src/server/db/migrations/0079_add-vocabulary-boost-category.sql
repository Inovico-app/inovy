ALTER TABLE "knowledge_base_entries" ADD COLUMN "boost" real;--> statement-breakpoint
ALTER TABLE "knowledge_base_entries" ADD COLUMN "category" text DEFAULT 'custom' NOT NULL;