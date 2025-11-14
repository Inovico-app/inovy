ALTER TABLE "data_exports" ADD COLUMN "file_data" bytea;--> statement-breakpoint
ALTER TABLE "data_exports" DROP COLUMN "download_url";

