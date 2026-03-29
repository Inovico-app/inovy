CREATE INDEX "notifications_user_org_read_idx" ON "notifications" USING btree ("user_id","organization_id","is_read");--> statement-breakpoint
CREATE INDEX "recordings_organization_id_idx" ON "recordings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tasks_organization_id_idx" ON "tasks" USING btree ("organization_id");