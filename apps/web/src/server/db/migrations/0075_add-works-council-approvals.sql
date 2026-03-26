CREATE TABLE "works_council_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_url" text NOT NULL,
	"approval_date" timestamp with time zone NOT NULL,
	"scope_description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"uploaded_by" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "works_council_approvals_org_id_idx" ON "works_council_approvals" USING btree ("organization_id");