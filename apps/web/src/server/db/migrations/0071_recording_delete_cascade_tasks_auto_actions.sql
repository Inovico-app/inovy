ALTER TABLE "auto_actions" DROP CONSTRAINT "auto_actions_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "auto_actions" DROP CONSTRAINT "auto_actions_recording_id_recordings_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_recording_id_recordings_id_fk";
--> statement-breakpoint
ALTER TABLE "auto_actions" ADD CONSTRAINT "auto_actions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_actions" ADD CONSTRAINT "auto_actions_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;