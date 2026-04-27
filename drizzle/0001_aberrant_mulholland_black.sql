CREATE TABLE "purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"program_slug" text NOT NULL,
	"program_type" "program_type" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"stripe_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"paid_at" timestamp,
	"refunded_at" timestamp,
	"refund_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_session_unique" ON "purchase" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "purchase_user_program_idx" ON "purchase" USING btree ("user_id","program_slug");