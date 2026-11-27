import type { ComponentProps } from "react";
import u from "./ui.module.css";

/**
 * The light bordered box screens repeat: board background, ink text and a
 * 4px ink border. A labelled section; the caller adds its shadow and size.
 */
export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={`${u.panel} ${className ?? ""}`} {...props} />;
}
