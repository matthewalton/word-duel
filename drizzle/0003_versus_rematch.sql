ALTER TABLE "versus_room" ADD COLUMN "match" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "versus_room" ADD COLUMN "p1_rematch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "versus_room" ADD COLUMN "p2_rematch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "versus_room" ADD COLUMN "p1_left" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "versus_room" ADD COLUMN "p2_left" boolean DEFAULT false NOT NULL;