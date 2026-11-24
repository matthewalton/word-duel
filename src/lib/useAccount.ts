"use client";

import { useCallback, useEffect, useState } from "react";
import { mergeGuestBests } from "@/server/progress";
import { authClient } from "./auth-client";
import { setAccountProgress, setGuestProgress } from "./progress";
import { PROVIDERS, type ProviderId } from "./providers";
import { clearGuestBests, listGuestBests } from "./storage";

export type AccountUser = { id: string; name: string };

/** How a provider link went, read from the URL the link redirect returns to. */
export type LinkResult = { provider: ProviderId; error: "taken" | "failed" | null };

/** Query parameter the link redirect returns with; Better Auth adds `error` on failure. */
const LINK_PARAM = "link";

const isProvider = (id: string | null): id is ProviderId =>
  id != null && (PROVIDERS as readonly string[]).includes(id);

let linkReturn: LinkResult | null | undefined;

/**
 * The link result in the address bar, read once per page load. Null on the
 * server (the title page is static) and when there is none.
 */
function readLinkResult(): LinkResult | null {
  if (typeof window === "undefined") return null;
  if (linkReturn !== undefined) return linkReturn;
  const params = new URLSearchParams(window.location.search);
  const provider = params.get(LINK_PARAM);
  const error = params.get("error");
  linkReturn = !isProvider(provider)
    ? null
    : { provider, error: !error ? null : error === "account_already_linked_to_different_user" ? "taken" : "failed" };
  return linkReturn;
}

/** Take the link result's parameters out of the address bar. */
function stripLinkParams() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LINK_PARAM)) return;
  for (const key of [LINK_PARAM, "error", "error_description"]) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url);
}

export type Account = {
  /** Null for a guest, and while the session is still loading. */
  user: AccountUser | null;
  pending: boolean;
  /** True briefly after the guest merge added at least one guest score to the account. */
  merged: boolean;
  /** Set after returning from linking a provider, until the menu is closed. */
  linkResult: LinkResult | null;
  clearLinkResult: () => void;
  signIn: (provider: ProviderId) => Promise<boolean>;
  /** Link another provider to the signed-in account (redirects away on success). */
  linkProvider: (provider: ProviderId) => Promise<boolean>;
  signOut: () => Promise<void>;
};

/**
 * The player's account: reads the session in the browser (the page stays
 * static), runs the guest merge whenever this browser holds guest scores while
 * signed in, and points best scores at the account or back at this browser.
 */
export function useAccount(packId: string): Account {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user.id ?? null;
  const [merged, setMerged] = useState(false);
  // Coming back from a provider link: the account menu says how it went.
  // Safe to read on the first render: the menu only shows once the session
  // has loaded, after hydration.
  const [linkResult, setLinkResult] = useState<LinkResult | null>(readLinkResult);
  useEffect(stripLinkParams, []);

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setGuestProgress();
      return;
    }
    let live = true;
    const guest = listGuestBests();
    mergeGuestBests(guest, packId)
      .then((result) => {
        if (!result) return;
        // The account has them now: this browser's guest scores go, even if
        // this effect was superseded meanwhile.
        clearGuestBests(guest);
        if (!live) return;
        setAccountProgress(packId, result.bests);
        if (result.added > 0) setMerged(true);
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
    const { error } = await authClient.signIn.social({ provider, callbackURL: "/" });
    return !error;
  }, []);

  const linkProvider = useCallback(async (provider: ProviderId) => {
    setLinkResult(null);
    const back = `/?${LINK_PARAM}=${provider}`;
    const { error } = await authClient.linkSocial({ provider, callbackURL: back, errorCallbackURL: back });
    if (error) setLinkResult({ provider, error: "failed" });
    return !error;
  }, []);

  const clearLinkResult = useCallback(() => setLinkResult(null), []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setMerged(false);
    setLinkResult(null);
  }, []);

  return {
    user: data?.user ? { id: data.user.id, name: data.user.name } : null,
    pending: isPending,
    merged,
    linkResult,
    clearLinkResult,
    signIn,
    linkProvider,
    signOut,
  };
}
