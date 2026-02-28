CREATE TYPE "public"."guardrails_action" AS ENUM('block', 'redact', 'warn');--> statement-breakpoint
CREATE TYPE "public"."guardrails_action_taken" AS ENUM('blocked', 'redacted', 'warned', 'passed');--> statement-breakpoint
CREATE TYPE "public"."guardrails_direction" AS ENUM('input', 'output');--> statement-breakpoint
CREATE TYPE "public"."guardrails_scope" AS ENUM('default', 'organization', 'project');--> statement-breakpoint
CREATE TYPE "public"."guardrails_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."guardrails_violation_type" AS ENUM('pii', 'jailbreak', 'toxicity', 'hallucination');--> statement-breakpoint
CREATE TABLE "guardrails_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "guardrails_scope" NOT NULL,
	"scope_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"pii_detection_enabled" boolean DEFAULT true NOT NULL,
	"pii_action" "guardrails_action" DEFAULT 'redact' NOT NULL,
	"pii_entities" jsonb DEFAULT '["EMAIL_ADDRESS","PHONE_NUMBER","PERSON","CREDIT_CARD","US_SSN","IBAN_CODE","IP_ADDRESS"]'::jsonb NOT NULL,
	"jailbreak_detection_enabled" boolean DEFAULT true NOT NULL,
	"jailbreak_action" "guardrails_action" DEFAULT 'block' NOT NULL,
	"toxicity_detection_enabled" boolean DEFAULT true NOT NULL,
	"toxicity_threshold" real DEFAULT 0.7 NOT NULL,
	"toxicity_action" "guardrails_action" DEFAULT 'block' NOT NULL,
	"hallucination_check_enabled" boolean DEFAULT false NOT NULL,
	"hallucination_action" "guardrails_action" DEFAULT 'warn' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardrails_policies_scope_scope_id_unique" UNIQUE("scope","scope_id")
);
--> statement-breakpoint
CREATE TABLE "guardrails_violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"user_id" text NOT NULL,
	"violation_type" "guardrails_violation_type" NOT NULL,
	"direction" "guardrails_direction" NOT NULL,
	"action_taken" "guardrails_action_taken" NOT NULL,
	"severity" "guardrails_severity" DEFAULT 'medium' NOT NULL,
	"guard_name" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_guardrails_policies_scope" ON "guardrails_policies" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_guardrails_policies_scope_id" ON "guardrails_policies" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX "idx_guardrails_violations_org_id" ON "guardrails_violations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_guardrails_violations_created_at" ON "guardrails_violations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_guardrails_violations_type" ON "guardrails_violations" USING btree ("violation_type");--> statement-breakpoint
INSERT INTO "guardrails_policies" ("scope", "scope_id", "enabled", "pii_detection_enabled", "pii_action", "jailbreak_detection_enabled", "jailbreak_action", "toxicity_detection_enabled", "toxicity_threshold", "toxicity_action", "hallucination_check_enabled", "hallucination_action")
VALUES ('default', NULL, true, true, 'redact', true, 'block', true, 0.7, 'block', false, 'warn')
ON CONFLICT ("scope", "scope_id") DO NOTHING;