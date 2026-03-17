ALTER TABLE "bot_sessions" ALTER COLUMN "meeting_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bot_settings" ADD COLUMN "preferred_calendar_provider" text;--> statement-breakpoint
ALTER TABLE "onboardings" ADD COLUMN "microsoft_connected_during_onboarding" boolean DEFAULT false NOT NULL;