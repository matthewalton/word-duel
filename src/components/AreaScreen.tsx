"use client";

import { useState, type ReactNode } from "react";
import { useAccount, type Account } from "@/lib/useAccount";
import { useChosenPack } from "@/lib/packChoice";
import type { LanguagePack } from "@/packs/types";
import { AreaBar, type Area } from "./AreaBar";
import styles from "./game.module.css";
import n from "./nav.module.css";
import { PackFonts, packVars } from "./PackFonts";
import { SignInDialog } from "./SignInDialog";
import { PortalRoot } from "./ui/PortalRoot";

/** What an area's contents get from the screen around them. */
export interface AreaProps {
  pack: LanguagePack;
  account: Account;
  openSignIn: () => void;
}

/**
 * An area screen that plays no solo duel (Versus, Study): loads the chosen
 * pack and the session, and puts the area's top bar over its contents.
 */
export function AreaScreen({ area, children }: { area: Area; children: (props: AreaProps) => ReactNode }) {
  const pack = useChosenPack();
  const account = useAccount(pack.meta.id);
  const [signInOpen, setSignInOpen] = useState(false);
  const openSignIn = () => setSignInOpen(true);

  return (
    <PortalRoot className={styles.page} style={packVars(pack)}>
      <PackFonts pack={pack} />
      <div className={n.screen}>
        <AreaBar area={area} pack={pack} account={account} onOpenSignIn={openSignIn} />
        {children({ pack, account, openSignIn })}
      </div>
      {signInOpen && <SignInDialog onClose={() => setSignInOpen(false)} onSignIn={account.signIn} />}
    </PortalRoot>
  );
}
