ALTER TABLE "invitations" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'user'::text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DEFAULT 'user'::text;--> statement-breakpoint
DROP TYPE "public"."organization_member_role";--> statement-breakpoint
CREATE TYPE "public"."organization_member_role" AS ENUM('owner', 'admin', 'superadmin', 'manager', 'user', 'viewer');--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'user'::"public"."organization_member_role";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DATA TYPE "public"."organization_member_role" USING "role"::"public"."organization_member_role";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DEFAULT 'user'::"public"."organization_member_role";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DATA TYPE "public"."organization_member_role" USING "role"::"public"."organization_member_role";--> statement-breakpoint
DROP INDEX "magic_links_email_idx";--> statement-breakpoint
DROP INDEX "magic_links_token_idx";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "magic_link_email_idx" ON "magic_links" USING btree ("email");--> statement-breakpoint
CREATE INDEX "magic_link_token_idx" ON "magic_links" USING btree ("token");