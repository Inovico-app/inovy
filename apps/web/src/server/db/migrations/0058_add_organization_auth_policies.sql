CREATE TABLE "organization_auth_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"require_email_verification" boolean DEFAULT true NOT NULL,
	"require_mfa" boolean DEFAULT false NOT NULL,
	"mfa_grace_period_days" integer DEFAULT 30,
	"password_min_length" integer DEFAULT 8 NOT NULL,
	"password_require_uppercase" boolean DEFAULT false NOT NULL,
	"password_require_lowercase" boolean DEFAULT false NOT NULL,
	"password_require_numbers" boolean DEFAULT false NOT NULL,
	"password_require_special_chars" boolean DEFAULT false NOT NULL,
	"password_history_count" integer DEFAULT 0,
	"password_expiration_days" integer,
	"session_timeout_minutes" integer DEFAULT 10080,
	"session_inactivity_timeout_minutes" integer DEFAULT 1440,
	"allowed_auth_methods" jsonb DEFAULT '["email-password","google","microsoft","magic-link","passkey"]'::jsonb NOT NULL,
	"ip_whitelist" jsonb,
	"allow_password_reset" boolean DEFAULT true NOT NULL,
	"max_failed_login_attempts" integer DEFAULT 5,
	"lockout_duration_minutes" integer DEFAULT 30,
	"additional_settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_auth_policies_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "user_mfa_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"totp_secret" text,
	"backup_codes" jsonb,
	"mfa_enrolled_at" timestamp,
	"last_mfa_verification_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_mfa_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"success" boolean NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_lockouts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"locked_until" timestamp NOT NULL,
	"reason" text NOT NULL,
	"unlocked" boolean DEFAULT false NOT NULL,
	"unlocked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "organization_auth_policies" ADD CONSTRAINT "organization_auth_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mfa_settings" ADD CONSTRAINT "user_mfa_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_lockouts" ADD CONSTRAINT "account_lockouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_auth_policies_organizationId_idx" ON "organization_auth_policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_mfa_settings_userId_idx" ON "user_mfa_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_history_userId_idx" ON "password_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_history_createdAt_idx" ON "password_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_userId_idx" ON "login_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "login_attempts_createdAt_idx" ON "login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "account_lockouts_userId_idx" ON "account_lockouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_lockouts_lockedUntil_idx" ON "account_lockouts" USING btree ("locked_until");
