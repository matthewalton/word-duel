"use client";

import type { ReactNode } from "react";
import { choosePack } from "@/lib/packChoice";
import type { Account } from "@/lib/useAccount";
import type { LanguagePack } from "@/packs/types";
import { AccountCorner } from "./AccountCorner";
import { LanguagePicker } from "./LanguagePicker";
import n from "./nav.module.css";

/**
 * The bar on top of the hub and the area screens: the brand or a back button
 * on the left, an area's title strip in the middle, and the language chip
 * and the account (or SIGN IN) on the right.
 */
export function TopBar({
  lead,
  title,
  pack,
  account,
  onOpenSignIn,
}: {
  lead: ReactNode;
  /** An area screen's coloured title strip; on a phone it drops under the bar. */
  title?: ReactNode;
  pack: LanguagePack;
  account: Account;
  onOpenSignIn: () => void;
}) {
  return (
    <header className={n.bar}>
      <div className={n.barLead}>{lead}</div>
      {title}
      <div className={n.barCorner}>
        <LanguagePicker pack={pack} onChoose={choosePack} />
        <AccountCorner account={account} packId={pack.meta.id} onOpenSignIn={onOpenSignIn} />
      </div>
    </header>
  );
}
