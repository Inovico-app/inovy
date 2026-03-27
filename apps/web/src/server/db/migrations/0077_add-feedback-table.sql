CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"recording_id" uuid NOT NULL,
	"type" text NOT NULL,
	"rating" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_user_id_recording_id_type_unique" UNIQUE("user_id","recording_id","type")
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_org_id_idx" ON "feedback" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "feedback_recording_id_idx" ON "feedback" USING btree ("recording_id");