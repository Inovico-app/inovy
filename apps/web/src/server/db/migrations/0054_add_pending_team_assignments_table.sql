CREATE TABLE "pending_team_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"invitation_id" text NOT NULL,
	"team_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_team_assignments" ADD CONSTRAINT "pending_team_assignments_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pendingTeamAssignments_invitationId_idx" ON "pending_team_assignments" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "pendingTeamAssignments_teamId_idx" ON "pending_team_assignments" USING btree ("team_id");