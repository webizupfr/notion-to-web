CREATE TABLE "email_sent" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_type" text NOT NULL,
	"program_slug" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "last_activity_at" timestamp;--> statement-breakpoint
ALTER TABLE "email_sent" ADD CONSTRAINT "email_sent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_sent_unique" ON "email_sent" USING btree ("user_id","email_type","program_slug");--> statement-breakpoint
CREATE INDEX "email_sent_user_idx" ON "email_sent" USING btree ("user_id");