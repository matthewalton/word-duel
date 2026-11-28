import type { Metadata } from "next";
import { StudyAreaScreen } from "@/components/StudyArea";
import { GAME_NAME } from "@/config/game";
import { strings } from "@/i18n/strings";

export const metadata: Metadata = {
  title: `${strings.studyArea.title} · ${GAME_NAME}`,
};

/** Static like `/`: the session, the pack and the wordbook load in the browser. */
export default function StudyPage() {
  return <StudyAreaScreen />;
}
