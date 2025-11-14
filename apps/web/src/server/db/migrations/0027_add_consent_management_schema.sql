CREATE TABLE "consent_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"participant_email" text NOT NULL,
	"participant_name" text,
	"consent_status" text DEFAULT 'pending' NOT NULL,
	"consent_method" text DEFAULT 'explicit' NOT NULL,
	"consent_given_at" timestamp with time zone,
	"consent_revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_participants_recording_id_participant_email_unique" UNIQUE("recording_id","participant_email")
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_given" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_given_by" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_given_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "consent_revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consent_participants" ADD CONSTRAINT "consent_participants_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;