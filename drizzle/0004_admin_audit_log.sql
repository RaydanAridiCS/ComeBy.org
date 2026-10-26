CREATE TYPE "public"."admin_action" AS ENUM('restore_event', 'delete_event');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"admin_id" text,
	"admin_email" text NOT NULL,
	"action" "admin_action" NOT NULL,
	"event_id" uuid NOT NULL,
	"event_title" text NOT NULL,
	"event_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" USING btree ("created_at");