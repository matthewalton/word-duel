"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_NAMESPACE } from "@/config/game";
import { mergeGuestBests } from "@/server/progress";
import { authClient } from "./auth-client";
import { setAccountProgress, setGuestProgress } from "./progress";
import type { ProviderId } from "./providers";
import { listGuestBests } from "./storage";

/** Set just before the OAuth redirect, so the return can say the merge happened. */
const SIGNING_IN_KEY = `${STORAGE_NAMESPACE}:signing-in`;

export type AccountUser = { id: string; name: string };

export type Account = {
  /** Null for a guest, and while the session is still loading. */
  user: AccountUser | null;
  pending: boolean;
  /** True briefly after a sign-in that brought guest progress into the account. */
  merged: boolean;
  signIn: (provider: ProviderId) => Promise<boolean>;
  signOut: () => Promise<void>;
};

/**
 * The player's account: reads the session in the browser (the page stays
 * static), runs the guest merge when a user appears, and points best scores
 * at the account or back at this browser.
 */
export function useAccount(packId: string): Account {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user.id ?? null;
  const [merged, setMerged] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setGuestProgress();
      return;
    }
    let live = true;
    const guest = listGuestBests();
    mergeGuestBests(guest, packId)
      .then((bests) => {
        if (!live || !bests) return;
        setAccountProgress(packId, bests);
        let justSignedIn = false;
        try {
          justSignedIn = window.sessionStorage.getItem(SIGNING_IN_KEY) != null;
          window.sessionStorage.removeItem(SIGNING_IN_KEY);
        } catch {
          // No session storage: skip the notice.
        }
        if (justSignedIn && guest.length > 0) setMerged(true);
      })
      .catch(() => {
        // Server unreachable: keep showing this browser's scores.
      });
    return () => {
      live = false;
    };
  }, [userId, isPending, packId]);

  useEffect(() => {
    if (!merged) return;
    const t = window.setTimeout(() => setMerged(false), 3000);
    return () => window.clearTimeout(t);
  }, [merged]);

  const signIn = useCallback(async (provider: ProviderId) => {
    try {
      window.sessionStorage.setItem(SIGNING_IN_KEY, provider);
    } catch {
      // No session storage: the merge still runs, only the notice is skipped.
    }
    const { error } = await authClient.signIn.social({ provider, callbackURL: "/" });
    return !error;
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setMerged(false);
  }, []);

  return {
    user: data?.user ? { id: data.user.id, name: data.user.name } : null,
    pending: isPending,
    merged,
    signIn,
    signOut,
  };
}
