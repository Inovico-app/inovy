DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD COLUMN "tool_calls" jsonb;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD COLUMN "token_count" integer;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_conversations" ADD COLUMN "summary" text;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

