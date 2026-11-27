import type { CSSProperties, ReactNode } from "react";
import type { LangText } from "@/game/types";

/** Inline text tagged with its language and direction. */
export function LangSpan({ t, className }: { t: LangText; className?: string }) {
  return (
    <span lang={t.lang} dir={t.dir} className={className}>
      {t.text}
    </span>
  );
}

export function wordBreakStyle(t: LangText): CSSProperties {
  return { wordBreak: t.wordBreak ?? "normal" };
}

/** Render a strings template, substituting {name} with React nodes. */
export function Template({ text, values }: { text: string; values: Record<string, ReactNode> }) {
  const parts = text.split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\{(\w+)\}$/.exec(part);
        return <span key={i}>{m && m[1] in values ? values[m[1]] : part}</span>;
      })}
    </>
  );
}
