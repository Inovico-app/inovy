CREATE TABLE "embedding_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" vector(3072) NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "embedding_cache_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE INDEX "idx_embedding_cache_hash" ON "embedding_cache" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_embedding_cache_model" ON "embedding_cache" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_embedding_cache_hash_model" ON "embedding_cache" USING btree ("content_hash","model");