"use client";

import { useState } from "react";
import { fill, strings } from "@/i18n/strings";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import a from "./account.module.css";
import { ProviderMark } from "./ProviderMark";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

/** Sign-in panel: one button per OAuth provider, and a way back to guest play. */
export function SignInDialog({
  onClose,
  onSignIn,
}: {
  onClose: () => void;
  onSignIn: (provider: ProviderId) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [failed, setFailed] = useState(false);

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
    <Dialog title={strings.account.panelTitle} closeLabel={strings.title.close} onClose={onClose} className={a.dialog}>
      <p className={a.body}>{strings.account.panelBody}</p>
      <div className={a.providers}>
        {PROVIDERS.map((p) => (
          <Button
            key={p}
            className={a.provider}
            disabled={busy != null}
            aria-busy={busy === p || undefined}
            onClick={() => choose(p)}
          >
            <ProviderMark provider={p} className={a.mark} />
            <span>{fill(strings.account.continueWith, { provider: strings.account.providers[p] }).toUpperCase()}</span>
          </Button>
        ))}
      </div>
      {failed && (
        <p className={a.error} role="alert">
          {strings.account.signInFailed}
        </p>
      )}
      <Button className={a.guest} onClick={onClose}>
        {strings.account.keepGuest}
      </Button>
    </Dialog>
  );
}
