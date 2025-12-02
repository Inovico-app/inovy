CREATE TABLE "agent_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"model" text DEFAULT 'gpt-5-nano' NOT NULL,
	"max_tokens" integer DEFAULT 4000 NOT NULL,
	"max_context_tokens" integer DEFAULT 4000 NOT NULL,
	"temperature" real DEFAULT 0.7 NOT NULL,
	"top_p" real DEFAULT 1 NOT NULL,
	"frequency_penalty" real DEFAULT 0 NOT NULL,
	"presence_penalty" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_settings_id_unique" UNIQUE("id")
);
