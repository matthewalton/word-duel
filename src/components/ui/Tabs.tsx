"use client";

import { Tabs as Radix } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import u from "./ui.module.css";

/**
 * Tabs with one panel showing at a time. The arrow keys move along the tabs
 * and the tab they land on is shown, wrapping at the ends. Lay out a TabList
 * and the current TabPanel anywhere inside.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
  children,
}: {
  tabs: readonly T[];
  value: T;
  onValueChange: (value: T) => void;
  /** Layout of the box that holds the list and the panel. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <Radix.Root
      value={value}
      onValueChange={(v) => {
        const picked = tabs.find((t) => t === v);
        if (picked) onValueChange(picked);
      }}
      className={className}
    >
      {children}
    </Radix.Root>
  );
}

/** The row of tabs; label is its accessible name. */
export function TabList({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <Radix.List aria-label={label} className={`${u.tabList} ${className ?? ""}`}>
      {children}
    </Radix.List>
  );
}

/** One tab, named by its value; yellow while its panel shows. */
export function Tab({ className, ...props }: ComponentProps<typeof Radix.Trigger>) {
  return <Radix.Trigger className={`${u.tab} ${className ?? ""}`} {...props} />;
}

/** What one tab shows; only the current tab's panel is rendered. */
export function TabPanel({ className, ...props }: ComponentProps<typeof Radix.Content>) {
  return <Radix.Content className={`${u.tabPanel} ${className ?? ""}`} {...props} />;
}
