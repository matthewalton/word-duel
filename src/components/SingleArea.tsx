"use client";

import { strings } from "@/i18n/strings";
import { AreaBar } from "./AreaBar";
import { MinigameCards } from "./MinigameCards";
import n from "./nav.module.css";
import { SoloScreen, type SoloMenuProps } from "./SoloScreen";
import t from "./title.module.css";

/**
 * The Single player area at `/play` (board NavDoorsSingle): BACK to the hub,
 * the yellow title strip, and the minigame cards with their difficulty
 * switch and direction toggle. Escape goes back too.
 */
export function SingleArea({ pack, minigames, best, account, settings, lastId, play, openSignIn }: SoloMenuProps) {
  const credits = pack.meta.credits?.length ? (
    <footer className={t.credits}>
      <span>{strings.creditsLabel} </span>
      {pack.meta.credits.map((c, i) => (
        <span key={c.url}>
          {i > 0 && " · "}
          <a href={c.url} target="_blank" rel="noreferrer">
            {c.author}, {c.name}
          </a>{" "}
          ({c.licence})
        </span>
      ))}
    </footer>
  ) : null;

  return (
    <div className={n.screen}>
      <AreaBar area="single" pack={pack} account={account} onOpenSignIn={openSignIn} />
      <MinigameCards
        key={pack.meta.id}
        pack={pack}
        minigames={minigames}
        best={best}
        initialId={lastId}
        direction={settings.direction}
        onDirection={settings.setDirection}
        difficulty={settings.difficulty}
        onDifficulty={settings.setDifficulty}
        onPlay={play}
      />
      {credits}
    </div>
  );
}

/** `/play`: the Single player area, swapped for a duel while one is played. */
export function SinglePlayerScreen() {
  return <SoloScreen menu={(props) => <SingleArea {...props} />} practice />;
}
