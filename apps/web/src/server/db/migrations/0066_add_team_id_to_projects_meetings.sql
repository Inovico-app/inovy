ALTER TABLE "projects" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_organization_team_idx" ON "projects" USING btree ("organization_id","team_id");--> statement-breakpoint
CREATE INDEX "meetings_organization_team_idx" ON "meetings" USING btree ("organization_id","team_id");