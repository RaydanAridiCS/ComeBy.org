CREATE TYPE "public"."suppression_reason" AS ENUM('unsubscribed', 'bounced', 'complained');--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"email" text PRIMARY KEY NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
