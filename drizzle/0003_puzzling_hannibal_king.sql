CREATE TABLE "certificate" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"program_slug" text NOT NULL,
	"code" text NOT NULL,
	"recipient_name" text NOT NULL,
	"program_title" text NOT NULL,
	"completed_at" timestamp NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_code_unique" ON "certificate" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_user_program_unique" ON "certificate" USING btree ("user_id","program_slug");