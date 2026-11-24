CREATE TABLE "duel" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pack_id" text NOT NULL,
	"minigame_id" text NOT NULL,
	"direction" text,
	"score" integer NOT NULL,
	"stage_reached" integer NOT NULL,
	"rounds" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_stat" (
	"user_id" text NOT NULL,
	"pack_id" text NOT NULL,
	"item_id" text NOT NULL,
	"prompt_kind" text NOT NULL,
	"right" integer DEFAULT 0 NOT NULL,
	"wrong" integer DEFAULT 0 NOT NULL,
	"timeouts" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_outcome" text NOT NULL,
	"first_seen_at" timestamp NOT NULL,
	"last_seen_at" timestamp NOT NULL,
	"last_missed_at" timestamp,
	CONSTRAINT "item_stat_user_id_pack_id_item_id_prompt_kind_pk" PRIMARY KEY("user_id","pack_id","item_id","prompt_kind")
);
--> statement-breakpoint
CREATE TABLE "round_result" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"duel_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"pack_id" text NOT NULL,
	"item_id" text NOT NULL,
	"prompt_id" text NOT NULL,
	"prompt_kind" text NOT NULL,
	"outcome" text NOT NULL,
	"given" text,
	"answer_ms" integer,
	"stage" integer NOT NULL,
	"at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "duel" ADD CONSTRAINT "duel_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_stat" ADD CONSTRAINT "item_stat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_result" ADD CONSTRAINT "round_result_duel_id_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_result" ADD CONSTRAINT "round_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "duel_user_id_ended_at_idx" ON "duel" USING btree ("user_id","ended_at");--> statement-breakpoint
CREATE INDEX "round_result_user_item_idx" ON "round_result" USING btree ("user_id","pack_id","item_id");--> statement-breakpoint
CREATE INDEX "round_result_user_at_idx" ON "round_result" USING btree ("user_id","at");