CREATE TABLE "transcript_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_session_id" uuid NOT NULL,
	"recording_id" uuid,
	"speaker_id" text,
	"text" text NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"confidence" real,
	"is_final" boolean DEFAULT false NOT NULL,
	"language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_bot_session_id_bot_sessions_id_fk" FOREIGN KEY ("bot_session_id") REFERENCES "public"."bot_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcript_chunks_recording_time_idx" ON "transcript_chunks" USING btree ("recording_id","start_time");--> statement-breakpoint
CREATE INDEX "transcript_chunks_session_idx" ON "transcript_chunks" USING btree ("bot_session_id");