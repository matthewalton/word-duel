"use client";

import { useEntry } from "@/lib/packChoice";
import { Hub } from "./Hub";
import { LanguageStep } from "./LanguageStep";
import { SoloScreen } from "./SoloScreen";

/**
 * `/`: the language step until a language is remembered, then the hub. The
 * static page renders only the grid, since only the browser knows which.
 */
export function HomeScreen() {
  const entry = useEntry();
  if (entry === "language") return <LanguageStep />;
  if (entry === "hub") return <SoloScreen menu={(props) => <Hub {...props} />} />;
  return null;
}
