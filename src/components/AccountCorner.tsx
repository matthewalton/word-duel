"use client";

import { useEffect, useRef, useState } from "react";
import { fill, strings } from "@/i18n/strings";
import { authClient } from "@/lib/auth-client";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import type { Account } from "@/lib/useAccount";
import a from "./account.module.css";

const isProvider = (id: string): id is ProviderId => (PROVIDERS as readonly string[]).includes(id);

/**
 * Top corner of the title screen: SIGN IN for a guest, or the account chip
 * with a menu to sign out. Shows nothing while the session loads.
 */
export function AccountCorner({ account, onOpenSignIn }: { account: Account; onOpenSignIn: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = account;

  if (account.pending) return null;

  if (!user)
    return (
      <button type="button" className={a.cornerButton} onClick={onOpenSignIn}>
        {strings.account.signIn}
      </button>
    );

  return (
    <div className={a.corner}>
      <button
        type="button"
        className={`${a.chip} ${menuOpen ? a.chipOpen : ""}`}
        aria-label={fill(strings.account.accountAria, { name: user.name })}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <Initial name={user.name} />
        <span className={a.chipName}>{user.name.toUpperCase()}</span>
        <svg className={a.caret} viewBox="0 0 5 3" shapeRendering="crispEdges" aria-hidden="true">
          <path fill="currentColor" d="M0 0h5v1h-5zM1 1h3v1h-3zM2 2h1v1h-1z" />
        </svg>
      </button>
      {account.merged && !menuOpen && (
        <div className={a.notice} role="status">
          {strings.account.merged}
        </div>
      )}
      {menuOpen && (
        <AccountMenu
          name={user.name}
          onClose={() => setMenuOpen(false)}
          onSignOut={() => {
            setMenuOpen(false);
            account.signOut();
          }}
        />
      )}
    </div>
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

function AccountMenu({ name, onClose, onSignOut }: { name: string; onClose: () => void; onSignOut: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [provider, setProvider] = useState<ProviderId | null>(null);

  // Which provider this account signs in with, for the "Signed in with" line.
  useEffect(() => {
    let live = true;
    authClient
      .listAccounts()
      .then(({ data }) => {
        const id = data?.map((acc) => acc.providerId).find(isProvider);
        if (live && id) setProvider(id);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Close on Escape or a click outside the menu and its chip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      const corner = ref.current?.parentElement;
      if (corner && !corner.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={a.menu}>
      <div className={a.menuHead}>
        <Initial name={name} large />
        <span className={a.menuWho}>
          <span className={a.menuName}>{name.toUpperCase()}</span>
          {provider && (
            <span className={a.menuProvider}>
              {fill(strings.account.signedInWith, { provider: strings.account.providers[provider] })}
            </span>
          )}
        </span>
      </div>
      <p className={a.menuNote}>{strings.account.savedNote}</p>
      <button type="button" className={a.signOut} onClick={onSignOut}>
        {strings.account.signOut}
      </button>
    </div>
  );
}
