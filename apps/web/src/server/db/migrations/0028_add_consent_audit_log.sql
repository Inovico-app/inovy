CREATE TABLE "consent_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"participant_email" text NOT NULL,
	"action" text NOT NULL,
	"performed_by" text NOT NULL,
	"performed_by_email" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_audit_log" ADD CONSTRAINT "consent_audit_log_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "consent_audit_log_recording_id_idx" ON "consent_audit_log" ("recording_id");
--> statement-breakpoint
CREATE INDEX "consent_audit_log_participant_email_idx" ON "consent_audit_log" ("participant_email");