CREATE TABLE "data_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"download_url" text,
	"expires_at" timestamp with time zone NOT NULL,
	"file_size" integer,
	"recordings_count" integer DEFAULT 0 NOT NULL,
	"tasks_count" integer DEFAULT 0 NOT NULL,
	"conversations_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
