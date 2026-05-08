CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"price_per_ticket" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"date" timestamp with time zone NOT NULL,
	"venue" varchar(255) NOT NULL,
	"total_tickets" integer NOT NULL,
	"booked_tickets" integer DEFAULT 0 NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"current_price" numeric(10, 2) NOT NULL,
	"price_floor" numeric(10, 2) NOT NULL,
	"price_ceiling" numeric(10, 2) NOT NULL,
	"pricing_rules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_event_id" ON "bookings" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_user_email" ON "bookings" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_bookings_created_at" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_events_date" ON "events" USING btree ("date");