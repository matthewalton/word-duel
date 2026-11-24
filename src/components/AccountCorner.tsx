"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fill, strings } from "@/i18n/strings";
import { authClient } from "@/lib/auth-client";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import type { Account, LinkResult } from "@/lib/useAccount";
import a from "./account.module.css";
import { ProviderMark } from "./ProviderMark";

const isProvider = (id: string): id is ProviderId => (PROVIDERS as readonly string[]).includes(id);

/**
 * Top corner of the title screen: SIGN IN for a guest, or the account chip
 * with a menu to link sign-in methods and sign out. Shows nothing while the
 * session loads. The menu opens by itself on return from linking a provider.
 */
export function AccountCorner({ account, onOpenSignIn }: { account: Account; onOpenSignIn: () => void }) {
  const [menuOpenState, setMenuOpen] = useState(false);
  const { user, linkResult, clearLinkResult } = account;
  const menuOpen = menuOpenState || linkResult != null;
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    clearLinkResult();
  }, [clearLinkResult]);

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
        onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
      >
        <Initial name={user.name} />
        <span className={a.chipName}>{user.name.toUpperCase()}</span>
        <svg className={a.caret} viewBox="0 0 5 3" shapeRendering="crispEdges" aria-hidden="true">
          <path fill="currentColor" d="M0 0h5v1h-5zM1 1h3v1h-3zM2 2h1v1h-1z" />
        </svg>
      </button>
      {menuOpen && (
        <AccountMenu
          name={user.name}
          linkResult={linkResult}
          onLink={account.linkProvider}
          onClose={closeMenu}
          onSignOut={() => {
            closeMenu();
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

function AccountMenu({
  name,
  linkResult,
  onLink,
  onClose,
  onSignOut,
}: {
  name: string;
  linkResult: LinkResult | null;
  onLink: (provider: ProviderId) => Promise<boolean>;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [linked, setLinked] = useState<ProviderId[] | null>(null);
  const [linking, setLinking] = useState<ProviderId | null>(null);

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
        <span className={a.menuName}>{name.toUpperCase()}</span>
      </div>
      <p className={a.menuNote}>{strings.account.savedNote}</p>
      {linked && (
        <div className={a.methods}>
          <span className={a.methodsLabel}>{strings.account.signInMethods}</span>
          <ul className={a.methodList}>
            {PROVIDERS.map((p) => {
              const providerName = strings.account.providers[p];
              return (
                <li key={p} className={a.method}>
                  <ProviderMark provider={p} className={a.mark} />
                  <span className={a.methodName}>{providerName.toUpperCase()}</span>
                  {linked.includes(p) ? (
                    <span className={a.linked}>
                      <svg viewBox="0 0 6 5" shapeRendering="crispEdges" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M5 0h1v1h-1zM4 1h1v1h-1zM0 2h1v1h-1zM3 2h1v1h-1zM1 3h2v1h-2zM2 4h1v1h-1z"
                        />
                      </svg>
                      {strings.account.linked}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={a.linkButton}
                      aria-label={fill(strings.account.linkAria, { provider: providerName })}
                      aria-busy={linking === p}
                      disabled={linking != null}
                      onClick={() => link(p)}
                    >
                      {strings.account.link}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {linkResult?.error && (
        <p className={a.linkError} role="alert">
          {fill(linkResult.error === "taken" ? strings.account.linkTaken : strings.account.linkFailed, {
            provider: strings.account.providers[linkResult.provider],
          })}
        </p>
      )}
      <button type="button" className={a.signOut} onClick={onSignOut}>
        {strings.account.signOut}
      </button>
    </div>
  );
}
