ALTER TABLE "chat_conversations" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "tool_calls" jsonb;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "token_count" integer;