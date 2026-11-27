import type { Metadata } from "next";
import { VersusScreen } from "@/components/VersusScreen";
import { GAME_NAME } from "@/config/game";
import { cleanCode } from "@/game/versus";
import { strings } from "@/i18n/strings";

export const metadata: Metadata = {
  title: `${strings.versus.panelTitle} · ${GAME_NAME}`,
};

/** A versus room: the link a friend opens joins it directly. The room loads in the browser. */
export default async function VersusPage({ params }: PageProps<"/versus/[code]">) {
  const { code } = await params;
  return <VersusScreen code={cleanCode(decodeURIComponent(code))} />;
}
