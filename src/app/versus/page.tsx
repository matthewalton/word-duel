import type { Metadata } from "next";
import { VersusAreaScreen } from "@/components/VersusArea";
import { GAME_NAME } from "@/config/game";
import { strings } from "@/i18n/strings";

export const metadata: Metadata = {
  title: `${strings.versusArea.title} · ${GAME_NAME}`,
};

/** Static like `/`: the session, the pack and the settings load in the browser. */
export default function VersusPage() {
  return <VersusAreaScreen />;
}
