import type { Metadata } from "next";
import { Suspense } from "react";
import { VersusScreen } from "@/components/VersusScreen";
import { GAME_NAME } from "@/config/game";
import { cleanCode } from "@/game/versus";
import { strings } from "@/i18n/strings";

export const metadata: Metadata = {
  title: `${strings.versus.panelTitle} · ${GAME_NAME}`,
};

/** A versus room: the link a friend opens joins it directly. The room loads in the browser. */
export default function VersusPage({ params }: PageProps<"/versus/[code]">) {
  // The code is only known per request, so it streams in behind the static shell.
  return (
    <Suspense>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: Pick<PageProps<"/versus/[code]">, "params">) {
  const { code } = await params;
  return <VersusScreen code={cleanCode(decodeURIComponent(code))} />;
}
