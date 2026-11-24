"use client";

import { useEffect, useRef, useState } from "react";
import { fill, strings } from "@/i18n/strings";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import a from "./account.module.css";
import { ProviderMark } from "./ProviderMark";
import t from "./title.module.css";

/**
 * Sign-in panel: one button per OAuth provider, and a way back to guest play.
 * Uses <dialog> for focus and Escape, like the how-to panel.
 */
export function SignInDialog({
  onClose,
  onSignIn,
}: {
  onClose: () => void;
  onSignIn: (provider: ProviderId) => Promise<boolean>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [failed, setFailed] = useState(false);

  // Open as a modal on mount; see HowToDialog for why there is no cleanup.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const choose = async (provider: ProviderId) => {
    setBusy(provider);
    setFailed(false);
    // On success the browser leaves for the provider, so only failure returns here.
    const ok = await onSignIn(provider).catch(() => false);
    if (!ok) {
      setBusy(null);
      setFailed(true);
    }
  };

  return (
    <dialog
      ref={ref}
      className={`${t.dialog} ${a.dialog}`}
      aria-labelledby="signin-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={a.dialogBody}>
        <div className={t.dialogHead}>
          <h2 id="signin-title" className={t.dialogTitle}>
            {strings.account.panelTitle}
          </h2>
          <button type="button" className={t.close} aria-label={strings.title.close} onClick={onClose}>
            ×
          </button>
        </div>
        <p className={a.body}>{strings.account.panelBody}</p>
        <div className={a.providers}>
          {PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              className={a.provider}
              disabled={busy != null}
              aria-busy={busy === p || undefined}
              onClick={() => choose(p)}
            >
              <ProviderMark provider={p} className={a.mark} />
              <span>{fill(strings.account.continueWith, { provider: strings.account.providers[p] }).toUpperCase()}</span>
            </button>
          ))}
        </div>
        {failed && (
          <p className={a.error} role="alert">
            {strings.account.signInFailed}
          </p>
        )}
        <button type="button" className={a.guest} onClick={onClose}>
          {strings.account.keepGuest}
        </button>
      </div>
    </dialog>
  );
}
