CREATE TABLE "versus_room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"pack_id" text NOT NULL,
	"direction" text NOT NULL,
	"difficulty" text NOT NULL,
	"draw" text[] NOT NULL,
	"p1_name" text,
	"p1_token" text NOT NULL,
	"p2_name" text,
	"p2_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "versus_round" (
	"room_id" uuid NOT NULL,
	"n" integer NOT NULL,
	"item_id" text NOT NULL,
	"fuse_ms" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"deadline" timestamp NOT NULL,
	"outcome" text,
	"winner" text,
	"p1_given" text,
	"p2_given" text,
	"resolved_at" timestamp,
	CONSTRAINT "versus_round_room_id_n_pk" PRIMARY KEY("room_id","n")
);
--> statement-breakpoint
ALTER TABLE "versus_round" ADD CONSTRAINT "versus_round_room_id_versus_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."versus_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "versus_room_code_idx" ON "versus_room" USING btree ("code","expires_at");