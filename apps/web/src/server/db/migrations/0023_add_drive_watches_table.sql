CREATE TABLE "drive_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"folder_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"expiration" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"project_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drive_watches_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
ALTER TABLE "drive_watches" ADD CONSTRAINT "drive_watches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drive_watches_expiration_idx" ON "drive_watches" USING btree ("expiration");--> statement-breakpoint
CREATE INDEX "drive_watches_is_active_idx" ON "drive_watches" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "drive_watches_user_id_folder_id_is_active_idx" ON "drive_watches" USING btree ("user_id","folder_id","is_active");--> statement-breakpoint
CREATE INDEX "drive_watches_project_id_idx" ON "drive_watches" USING btree ("project_id");