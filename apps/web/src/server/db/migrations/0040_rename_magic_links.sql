ALTER TABLE "magic_link" RENAME TO "magic_links";--> statement-breakpoint
ALTER TABLE "magic_links" DROP CONSTRAINT "magic_link_token_unique";--> statement-breakpoint
DROP INDEX "magic_link_email_idx";--> statement-breakpoint
DROP INDEX "magic_link_token_idx";--> statement-breakpoint
CREATE INDEX "magic_links_email_idx" ON "magic_links" USING btree ("email");--> statement-breakpoint
CREATE INDEX "magic_links_token_idx" ON "magic_links" USING btree ("token");--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_token_unique" UNIQUE("token");