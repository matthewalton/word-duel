CREATE TABLE "versus_match" (
	"room_id" uuid NOT NULL,
	"match" integer NOT NULL,
	"minigame" text NOT NULL,
	"p1_user_id" text,
	"p1_name" text,
	"p2_user_id" text,
	"p2_name" text,
	"winner" text NOT NULL,
	"reason" text NOT NULL,
	"p1_hearts" integer NOT NULL,
	"p2_hearts" integer NOT NULL,
	"ended_at" timestamp NOT NULL,
	CONSTRAINT "versus_match_room_id_match_pk" PRIMARY KEY("room_id","match")
);
--> statement-breakpoint
ALTER TABLE "versus_room" ADD COLUMN "p1_user_id" text;--> statement-breakpoint
ALTER TABLE "versus_room" ADD COLUMN "p2_user_id" text;--> statement-breakpoint
ALTER TABLE "versus_match" ADD CONSTRAINT "versus_match_p1_user_id_user_id_fk" FOREIGN KEY ("p1_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versus_match" ADD CONSTRAINT "versus_match_p2_user_id_user_id_fk" FOREIGN KEY ("p2_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "versus_match_p1_user_idx" ON "versus_match" USING btree ("p1_user_id","ended_at");--> statement-breakpoint
CREATE INDEX "versus_match_p2_user_idx" ON "versus_match" USING btree ("p2_user_id","ended_at");--> statement-breakpoint
ALTER TABLE "versus_room" ADD CONSTRAINT "versus_room_p1_user_id_user_id_fk" FOREIGN KEY ("p1_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versus_room" ADD CONSTRAINT "versus_room_p2_user_id_user_id_fk" FOREIGN KEY ("p2_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;