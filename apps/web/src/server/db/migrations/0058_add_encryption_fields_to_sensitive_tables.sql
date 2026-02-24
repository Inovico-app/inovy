-- Migration: Add encryption fields to sensitive tables for SSD-4.2.02 compliance
-- Adds isEncrypted and encryptionMetadata fields to tables containing classified data
-- Per default: encryption is mandatory for CONFIDENTIAL and HIGHLY_CONFIDENTIAL data

-- AI Insights (CONFIDENTIAL) - content contains sensitive AI-generated insights
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "is_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "ai_insights" ADD COLUMN IF NOT EXISTS "encryption_metadata" text;

-- Chat Messages (CONFIDENTIAL) - content contains user and AI conversations
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "is_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "encryption_metadata" text;

-- Tasks (CONFIDENTIAL) - description contains sensitive task details
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "encryption_metadata" text;

-- Consent Participants (HIGHLY_CONFIDENTIAL) - contains PII (email, name)
ALTER TABLE "consent_participants" ADD COLUMN IF NOT EXISTS "email_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "consent_participants" ADD COLUMN IF NOT EXISTS "email_encryption_metadata" text;
ALTER TABLE "consent_participants" ADD COLUMN IF NOT EXISTS "name_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "consent_participants" ADD COLUMN IF NOT EXISTS "name_encryption_metadata" text;

-- Transcription History (HIGHLY_CONFIDENTIAL) - content contains full transcription snapshots
ALTER TABLE "transcription_history" ADD COLUMN IF NOT EXISTS "is_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "transcription_history" ADD COLUMN IF NOT EXISTS "encryption_metadata" text;

-- Summary History (CONFIDENTIAL) - content contains AI-generated summary snapshots
ALTER TABLE "summary_history" ADD COLUMN IF NOT EXISTS "is_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "summary_history" ADD COLUMN IF NOT EXISTS "encryption_metadata" text;

-- Recordings table - add encryption fields for transcription text fields (already has file encryption)
ALTER TABLE "recordings" ADD COLUMN IF NOT EXISTS "transcription_encrypted" boolean DEFAULT false NOT NULL;
ALTER TABLE "recordings" ADD COLUMN IF NOT EXISTS "transcription_encryption_metadata" text;

-- Create indexes on isEncrypted fields for query performance
CREATE INDEX IF NOT EXISTS "ai_insights_is_encrypted_idx" ON "ai_insights" ("is_encrypted");
CREATE INDEX IF NOT EXISTS "chat_messages_is_encrypted_idx" ON "chat_messages" ("is_encrypted");
CREATE INDEX IF NOT EXISTS "tasks_is_encrypted_idx" ON "tasks" ("is_encrypted");
CREATE INDEX IF NOT EXISTS "transcription_history_is_encrypted_idx" ON "transcription_history" ("is_encrypted");
CREATE INDEX IF NOT EXISTS "summary_history_is_encrypted_idx" ON "summary_history" ("is_encrypted");
CREATE INDEX IF NOT EXISTS "recordings_transcription_encrypted_idx" ON "recordings" ("transcription_encrypted");

-- Comments for documentation
COMMENT ON COLUMN "ai_insights"."is_encrypted" IS 'SSD-4.2.02: Indicates if content field is encrypted (CONFIDENTIAL classification)';
COMMENT ON COLUMN "chat_messages"."is_encrypted" IS 'SSD-4.2.02: Indicates if content field is encrypted (CONFIDENTIAL classification)';
COMMENT ON COLUMN "tasks"."is_encrypted" IS 'SSD-4.2.02: Indicates if description field is encrypted (CONFIDENTIAL classification)';
COMMENT ON COLUMN "consent_participants"."email_encrypted" IS 'SSD-4.2.02: Indicates if participantEmail field is encrypted (HIGHLY_CONFIDENTIAL - PII)';
COMMENT ON COLUMN "consent_participants"."name_encrypted" IS 'SSD-4.2.02: Indicates if participantName field is encrypted (HIGHLY_CONFIDENTIAL - PII)';
COMMENT ON COLUMN "transcription_history"."is_encrypted" IS 'SSD-4.2.02: Indicates if content field is encrypted (HIGHLY_CONFIDENTIAL classification)';
COMMENT ON COLUMN "summary_history"."is_encrypted" IS 'SSD-4.2.02: Indicates if content field is encrypted (CONFIDENTIAL classification)';
COMMENT ON COLUMN "recordings"."transcription_encrypted" IS 'SSD-4.2.02: Indicates if transcription text fields are encrypted (HIGHLY_CONFIDENTIAL classification)';
