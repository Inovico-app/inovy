ALTER TABLE "magic_links" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "magic_links" CASCADE;--> statement-breakpoint
DROP INDEX "idx_organizations_agent_enabled";--> statement-breakpoint
ALTER TABLE "agent_settings" ALTER COLUMN "model" SET DEFAULT 'claude-sonnet-4-6';--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "agent_enabled" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "twoFactors_secret_idx" ON "two_factors" USING btree ("secret");