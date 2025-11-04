DO $$ BEGIN
 ALTER TABLE "chat_conversations" ADD COLUMN "context" text NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_context_idx" ON "chat_conversations" USING btree ("context");