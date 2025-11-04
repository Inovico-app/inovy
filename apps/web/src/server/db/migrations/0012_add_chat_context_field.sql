-- Add explicit context column for clarity
ALTER TABLE chat_conversations 
ADD COLUMN context text CHECK (context IN ('project', 'organization'));

-- Backfill existing conversations
UPDATE chat_conversations 
SET context = CASE 
  WHEN project_id IS NULL THEN 'organization' 
  ELSE 'project' 
END;

-- Make context required
ALTER TABLE chat_conversations 
ALTER COLUMN context SET NOT NULL;

-- Add index for filtering by context
CREATE INDEX chat_conversations_context_idx ON chat_conversations(context);

