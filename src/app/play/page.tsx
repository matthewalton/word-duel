import type { Metadata } from "next";
import { SinglePlayerScreen } from "@/components/SingleArea";
import { GAME_NAME } from "@/config/game";
import { strings } from "@/i18n/strings";

export const metadata: Metadata = {
  title: `${strings.nav.singleTitle} · ${GAME_NAME}`,
};

/** Static like `/`: the session, the pack and the settings load in the browser. */
export default function PlayPage() {
  return <SinglePlayerScreen />;
}
