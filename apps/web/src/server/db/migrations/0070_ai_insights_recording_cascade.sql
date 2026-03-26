ALTER TABLE "ai_insights" DROP CONSTRAINT "ai_insights_recording_id_recordings_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;