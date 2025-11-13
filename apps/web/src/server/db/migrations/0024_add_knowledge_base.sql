CREATE TABLE "knowledge_base_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"scope_id" text,
	"term" text NOT NULL,
	"definition" text NOT NULL,
	"context" text,
	"examples" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_base_entries_scope_check" CHECK ("scope" IN ('project', 'organization', 'global')),
	CONSTRAINT "knowledge_base_entries_scope_scope_id_term_unique" UNIQUE("scope", "scope_id", "term")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"scope_id" text,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint NOT NULL,
	"file_type" text NOT NULL,
	"extracted_text" text,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_base_documents_scope_check" CHECK ("scope" IN ('project', 'organization', 'global')),
	CONSTRAINT "knowledge_base_documents_processing_status_check" CHECK ("processing_status" IN ('pending', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "knowledge_base_entries_scope_scope_id_term_idx" ON "knowledge_base_entries" USING btree ("scope", "scope_id", "term");--> statement-breakpoint
CREATE INDEX "knowledge_base_entries_scope_scope_id_is_active_idx" ON "knowledge_base_entries" USING btree ("scope", "scope_id", "is_active");--> statement-breakpoint
CREATE INDEX "knowledge_base_documents_scope_scope_id_idx" ON "knowledge_base_documents" USING btree ("scope", "scope_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_documents_processing_status_idx" ON "knowledge_base_documents" USING btree ("processing_status");

