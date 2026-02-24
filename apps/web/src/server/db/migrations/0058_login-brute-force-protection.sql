CREATE TABLE "account_lockouts" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"locked_until" timestamp NOT NULL,
	"failed_attempts" integer NOT NULL,
	"ip_address" text,
	CONSTRAINT "account_lockouts_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"user_id" text,
	"ip_address" text,
	"user_agent" text,
	"success" text NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_lockouts_identifier_idx" ON "account_lockouts" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "account_lockouts_lockedUntil_idx" ON "account_lockouts" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX "login_attempts_identifier_idx" ON "login_attempts" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "login_attempts_userId_idx" ON "login_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_attempts_attemptedAt_idx" ON "login_attempts" USING btree ("attempted_at");