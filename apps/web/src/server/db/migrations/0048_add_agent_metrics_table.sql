CREATE TYPE "public"."agent_request_type" AS ENUM('chat', 'knowledge_base', 'other');--> statement-breakpoint
CREATE TABLE "agent_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" uuid,
	"request_type" "agent_request_type" DEFAULT 'chat' NOT NULL,
	"latency_ms" integer,
	"error" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"token_count" integer,
	"tool_calls" jsonb,
	"query" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "agent_metrics_organization_id_idx" ON "agent_metrics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_metrics_user_id_idx" ON "agent_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_metrics_created_at_idx" ON "agent_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agent_metrics_request_type_idx" ON "agent_metrics" USING btree ("request_type");