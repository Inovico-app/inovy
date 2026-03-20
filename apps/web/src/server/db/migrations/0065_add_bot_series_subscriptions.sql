CREATE TABLE "bot_series_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"recurring_series_id" text NOT NULL,
	"calendar_provider" text NOT NULL,
	"calendar_id" text NOT NULL,
	"series_title" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_series_sub_user_org_series_unique" UNIQUE("user_id","organization_id","recurring_series_id")
);
--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
CREATE INDEX "bot_series_sub_user_org_active_idx" ON "bot_series_subscriptions" USING btree ("user_id","organization_id","active");--> statement-breakpoint
CREATE INDEX "bot_series_sub_org_series_idx" ON "bot_series_subscriptions" USING btree ("organization_id","recurring_series_id");--> statement-breakpoint
ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_subscription_id_bot_series_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."bot_series_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bot_sessions_subscription_id_idx" ON "bot_sessions" USING btree ("subscription_id");--> statement-breakpoint
UPDATE "bot_sessions" SET "bot_status" = 'failed' WHERE "bot_status" = 'pending_consent';--> statement-breakpoint
UPDATE "notifications" SET "type" = 'bot_session_update' WHERE "type" = 'bot_consent_request';--> statement-breakpoint
ALTER TABLE "bot_settings" DROP COLUMN "auto_join_enabled";--> statement-breakpoint
ALTER TABLE "bot_settings" DROP COLUMN "require_per_meeting_consent";