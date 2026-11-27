import type { Metadata } from "next";
import { WordbookScreen } from "@/components/WordbookScreen";
import { GAME_NAME } from "@/config/game";
import { strings } from "@/i18n/strings";

export const metadata: Metadata = {
  title: `${strings.wordbook.pageTitle} · ${GAME_NAME}`,
};

/** Static like the title page: the session and the wordbook load in the browser. */
export default function WordbookPage() {
  return <WordbookScreen />;
}
