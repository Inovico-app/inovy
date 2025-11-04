ALTER TABLE "chat_conversations" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "chat_conversations_deleted_at_idx" ON "chat_conversations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "chat_conversations_archived_at_idx" ON "chat_conversations" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "chat_conversations_user_deleted_updated_idx" ON "chat_conversations" USING btree ("user_id","deleted_at","updated_at");