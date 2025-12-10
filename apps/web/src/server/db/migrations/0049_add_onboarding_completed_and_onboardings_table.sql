CREATE TYPE "public"."signup_method" AS ENUM('email', 'google', 'microsoft', 'magic_link', 'passkey');--> statement-breakpoint
CREATE TYPE "public"."signup_type" AS ENUM('individual', 'organization');--> statement-breakpoint
CREATE TABLE "onboardings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"organization_id" text,
	"signup_type" "signup_type" NOT NULL,
	"org_size" integer,
	"referral_source" text,
	"signup_method" "signup_method" NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "onboardings" ADD CONSTRAINT "onboardings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboardings" ADD CONSTRAINT "onboardings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboardings_user_id_idx" ON "onboardings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onboardings_organization_id_idx" ON "onboardings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "onboardings_signup_type_idx" ON "onboardings" USING btree ("signup_type");--> statement-breakpoint
CREATE INDEX "onboardings_signup_method_idx" ON "onboardings" USING btree ("signup_method");--> statement-breakpoint
CREATE INDEX "onboardings_created_at_idx" ON "onboardings" USING btree ("created_at");