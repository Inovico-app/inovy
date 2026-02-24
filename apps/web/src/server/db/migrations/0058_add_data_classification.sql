CREATE TABLE "classification_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"data_type" text NOT NULL,
	"default_classification_level" text NOT NULL,
	"requires_encryption_at_rest" boolean DEFAULT true NOT NULL,
	"requires_encryption_in_transit" boolean DEFAULT true NOT NULL,
	"encryption_algorithm" text DEFAULT 'AES-256-GCM' NOT NULL,
	"retention_period_days" integer,
	"policy_rules" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"classification_level" text NOT NULL,
	"requires_encryption" boolean DEFAULT true NOT NULL,
	"encryption_algorithm" text,
	"retention_period_days" integer,
	"classification_reason" text,
	"classification_metadata" jsonb,
	"has_pii" boolean DEFAULT false NOT NULL,
	"has_phi" boolean DEFAULT false NOT NULL,
	"has_financial_data" boolean DEFAULT false NOT NULL,
	"detected_pii_types" jsonb,
	"classified_by_id" text,
	"classified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "data_classification_level" text DEFAULT 'confidential' NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "classification_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "classified_at" timestamp with time zone;