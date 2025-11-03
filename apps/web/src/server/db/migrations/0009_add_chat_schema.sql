-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create chat_embeddings table for storing vector embeddings
CREATE TABLE IF NOT EXISTS "chat_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"content_type" text NOT NULL,
	"content_id" uuid NOT NULL,
	"content_text" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create chat_conversations table for storing conversation history
CREATE TABLE IF NOT EXISTS "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create chat_messages table for storing individual messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "chat_embeddings" ADD CONSTRAINT "chat_embeddings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for chat_embeddings
CREATE INDEX IF NOT EXISTS "chat_embeddings_project_id_idx" ON "chat_embeddings" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "chat_embeddings_organization_id_idx" ON "chat_embeddings" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "chat_embeddings_content_type_idx" ON "chat_embeddings" USING btree ("content_type");
CREATE INDEX IF NOT EXISTS "chat_embeddings_content_id_idx" ON "chat_embeddings" USING btree ("content_id");

-- Create vector similarity search index using HNSW (Hierarchical Navigable Small World) for fast approximate nearest neighbor search
-- Using cosine distance (vector_cosine_ops) for similarity matching
CREATE INDEX IF NOT EXISTS "chat_embeddings_embedding_idx" ON "chat_embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- Create indexes for chat_conversations
CREATE INDEX IF NOT EXISTS "chat_conversations_project_id_idx" ON "chat_conversations" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_idx" ON "chat_conversations" USING btree ("user_id");

-- Create indexes for chat_messages
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chat_messages" USING btree ("conversation_id");
CREATE INDEX IF NOT EXISTS "chat_messages_role_idx" ON "chat_messages" USING btree ("role");

-- Create a helper function for vector similarity search with project filtering
CREATE OR REPLACE FUNCTION search_embeddings_by_similarity(
  query_embedding vector(1536),
  project_id_filter uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  content_type text,
  content_id uuid,
  content_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.project_id,
    ce.content_type,
    ce.content_id,
    ce.content_text,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) as similarity
  FROM chat_embeddings ce
  WHERE ce.project_id = project_id_filter
    AND ce.embedding IS NOT NULL
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

