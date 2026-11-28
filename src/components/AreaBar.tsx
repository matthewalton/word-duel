"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { strings } from "@/i18n/strings";
import type { Account } from "@/lib/useAccount";
import type { LanguagePack } from "@/packs/types";
import n from "./nav.module.css";
import { TopBar } from "./TopBar";

const s = strings.nav;

export type Area = "single" | "versus" | "study";

const AREAS = {
  single: { name: s.single, strip: n.areaSingle },
  versus: { name: s.versus, strip: n.areaVersus },
  study: { name: s.study, strip: n.areaStudy },
} as const satisfies Record<Area, { name: string; strip: string | undefined }>;

/**
 * An area screen's top bar (board NavDoorsSingle and its siblings): BACK to
 * the hub, the area's title strip in its colour, the language chip and the
 * account. Escape goes back to the hub too, unless a menu or dialog is open
 * (it closes that instead).
 */
export function AreaBar({
  area,
  pack,
  account,
  onOpenSignIn,
}: {
  area: Area;
  pack: LanguagePack;
  account: Account;
  onOpenSignIn: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest('[role="menu"], [role="dialog"]')) return;
      router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const { name, strip } = AREAS[area];
  return (
    <TopBar
      lead={
        <Link href="/" className={n.back} aria-label={s.backAria}>
          &lt;<span className={n.backLabel}> {s.back}</span>
        </Link>
      }
      title={<h1 className={`${n.areaTitle} ${strip}`}>{name}</h1>}
      pack={pack}
      account={account}
      onOpenSignIn={onOpenSignIn}
    />
  );
}
