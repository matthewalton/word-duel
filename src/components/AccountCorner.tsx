"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { fill, strings } from "@/i18n/strings";
import { authClient } from "@/lib/auth-client";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import type { Account, LinkResult } from "@/lib/useAccount";
import { countMissed } from "@/server/wordbook";
import a from "./account.module.css";
import { BookIcon } from "./BookIcon";
import { ProviderMark } from "./ProviderMark";
import { TrophyIcon } from "./TrophyIcon";
import { Button } from "./ui/Button";
import { Menu, MenuGroup, MenuItem, MenuLabel } from "./ui/Menu";
import { VersusRecordDialog } from "./VersusRecordDialog";

const isProvider = (id: string): id is ProviderId => (PROVIDERS as readonly string[]).includes(id);

/**
 * The top bar's corner: SIGN IN for a guest, or the account chip with a
 * menu to the wordbook and the versus record, to link sign-in methods and
 * sign out. Shows nothing while the
 * session loads. The menu opens by itself on return from linking a provider.
 */
export function AccountCorner({
  account,
  packId,
  onOpenSignIn,
}: {
  account: Account;
  packId: string;
  onOpenSignIn: () => void;
}) {
  const [menuOpenState, setMenuOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const { user, linkResult, clearLinkResult } = account;
  const menuOpen = menuOpenState || linkResult != null;
  const noteId = useId();
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    clearLinkResult();
  }, [clearLinkResult]);

  if (account.pending) return null;

  if (!user)
    return (
      <Button variant="outlined" className={a.signIn} onClick={onOpenSignIn}>
        {strings.account.signIn}
      </Button>
    );

  const accountAria = fill(strings.account.accountAria, { name: user.name });
  return (
    <>
      <Menu
        label={accountAria}
        describedBy={noteId}
        align="end"
        open={menuOpen}
        onOpenChange={(open) => (open ? setMenuOpen(true) : closeMenu())}
        className={a.menu}
        trigger={
          <Button ref={chip} variant="outlined" className={a.chip} aria-label={accountAria}>
            <Initial name={user.name} />
            <span className={a.chipName}>{user.name.toUpperCase()}</span>
            <svg className={a.caret} viewBox="0 0 5 3" shapeRendering="crispEdges" aria-hidden="true">
              <path fill="currentColor" d="M0 0h5v1h-5zM1 1h3v1h-3zM2 2h1v1h-1z" />
            </svg>
          </Button>
        }
      >
        <AccountMenu
          name={user.name}
          noteId={noteId}
          packId={packId}
          linkResult={linkResult}
          onLink={account.linkProvider}
          onOpenRecord={() => {
            // The dialog hands focus back to what had it when it opened: the
            // chip, not the menu item that is about to go.
            chip.current?.focus();
            setRecordOpen(true);
          }}
          onSignOut={account.signOut}
        />
      </Menu>
      {recordOpen && <VersusRecordDialog onClose={() => setRecordOpen(false)} />}
    </>
  );
}

function Initial({ name, large }: { name: string; large?: boolean }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span className={`${a.initial} ${large ? a.initialLarge : ""}`} aria-hidden="true">
      {initial}
    </span>
  );
}

function AccountMenu({
  name,
  noteId,
  packId,
  linkResult,
  onLink,
  onOpenRecord,
  onSignOut,
}: {
  name: string;
  /** The saved note's id: it describes the menu, since a menu reads only its items. */
  noteId: string;
  packId: string;
  linkResult: LinkResult | null;
  onLink: (provider: ProviderId) => Promise<boolean>;
  onOpenRecord: () => void;
  onSignOut: () => void;
}) {
  const [linked, setLinked] = useState<ProviderId[] | null>(null);
  const [linking, setLinking] = useState<ProviderId | null>(null);
  const [missed, setMissed] = useState<number | null>(null);
  const methodsId = useId();

  // How many items the wordbook lists as missed, for its row.
  useEffect(() => {
    let live = true;
    countMissed(packId)
      .then((n) => {
        if (live) setMissed(n);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [packId]);

  // Which providers reach this account, for the sign-in methods list.
  useEffect(() => {
    let live = true;
    authClient
      .listAccounts()
      .then(({ data }) => {
        if (live && data) setLinked(data.map((acc) => acc.providerId).filter(isProvider));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const link = async (provider: ProviderId) => {
    setLinking(provider);
    // On success the page redirects to the provider; stay busy until then.
    if (!(await onLink(provider))) setLinking(null);
  };

  // The row shows the missed count as a bare number; its label says what it counts.
  const wordbookAria = !missed
    ? undefined
    : missed === 1
      ? strings.wordbook.missedRowAriaOne
      : fill(strings.wordbook.missedRowAria, { n: missed });

  return (
    <>
      <div className={a.menuHead}>
        <Initial name={name} large />
        <span className={a.menuName}>{name.toUpperCase()}</span>
      </div>
      <MenuItem asChild>
        <Link
          href="/wordbook"
          className={a.menuRow}
          aria-label={wordbookAria}
        >
          <BookIcon className={a.wordbookIcon} />
          <span className={a.menuRowName}>{strings.wordbook.title}</span>
          {missed ? <span className={a.menuWordbookCount}>{missed}</span> : null}
          <span aria-hidden="true">&gt;</span>
        </Link>
      </MenuItem>
      <MenuItem asChild onSelect={onOpenRecord}>
        <Button className={a.menuRow}>
          <TrophyIcon className={a.trophyIcon} />
          <span className={a.menuRowName}>{strings.versusRecord.title}</span>
          <span aria-hidden="true">&gt;</span>
        </Button>
      </MenuItem>
      <p id={noteId} className={a.menuNote}>
        {strings.account.savedNote}
      </p>
      {linked && (
        <MenuGroup className={a.methods} aria-labelledby={methodsId}>
          <MenuLabel id={methodsId} className={a.methodsLabel}>
            {strings.account.signInMethods}
          </MenuLabel>
          <div className={a.methodList}>
            {PROVIDERS.map((p) => {
              const providerName = strings.account.providers[p];
              const row = (
                <>
                  <ProviderMark provider={p} className={a.mark} />
                  <span className={a.methodName}>{providerName.toUpperCase()}</span>
                </>
              );
              // A linked method is a disabled item, so a screen reader still reads it
              // while the arrow keys pass over it; an unlinked one's LINK is the item.
              return linked.includes(p) ? (
                <MenuItem
                  key={p}
                  disabled
                  className={a.method}
                  aria-label={fill(strings.account.linkedAria, { provider: providerName })}
                >
                  {row}
                  <span className={a.linked}>
                    <svg viewBox="0 0 6 5" shapeRendering="crispEdges" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M5 0h1v1h-1zM4 1h1v1h-1zM0 2h1v1h-1zM3 2h1v1h-1zM1 3h2v1h-2zM2 4h1v1h-1z"
                      />
                    </svg>
                    {strings.account.linked}
                  </span>
                </MenuItem>
              ) : (
                <div key={p} className={a.method}>
                  {row}
                  <MenuItem
                    asChild
                    disabled={linking != null}
                    // Stay open while the browser leaves for the provider.
                    onSelect={(e) => {
                      e.preventDefault();
                      link(p);
                    }}
                  >
                    <Button
                      className={a.linkButton}
                      aria-label={fill(strings.account.linkAria, { provider: providerName })}
                      aria-busy={linking === p}
                    >
                      {strings.account.link}
                    </Button>
                  </MenuItem>
                </div>
              );
            })}
          </div>
        </MenuGroup>
      )}
      {linkResult?.error && (
        <p className={a.linkError} role="alert">
          {fill(linkResult.error === "taken" ? strings.account.linkTaken : strings.account.linkFailed, {
            provider: strings.account.providers[linkResult.provider],
          })}
        </p>
      )}
      <MenuItem asChild onSelect={onSignOut}>
        <Button variant="outlined" className={a.signOut}>
          {strings.account.signOut}
        </Button>
      </MenuItem>
    </>
  );
}
