"use client";

import { ToggleGroup as Radix } from "radix-ui";
import { useEffect, useRef, type ReactNode } from "react";
import u from "./ui.module.css";

/**
 * Joined buttons with exactly one chosen, like radio buttons: the arrow keys
 * move along them and the option they land on is chosen. They stop at the
 * ends, and the chosen option can't be switched off. When the value changes
 * from outside (the minigame cards' up and down keys) while the group has
 * focus, focus moves to the new choice too.
 */
export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
  optionClassName,
  isDisabled,
  renderOption,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onValueChange: (value: T) => void;
  /** Layout for the group, such as separate tiles instead of joined boxes. */
  className?: string;
  /** A class per option, such as its colour when chosen. */
  optionClassName?: (option: T) => string;
  /** Options that can't be chosen now; the arrow keys skip them. */
  isDisabled?: (option: T) => boolean;
  renderOption: (option: T, index: number) => ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focused = document.activeElement;
    if (!root.current?.contains(focused) || focused === root.current) return;
    root.current.querySelector<HTMLElement>('[data-state="on"]')?.focus();
  }, [value]);

  return (
    <Radix.Root
      ref={root}
      type="single"
      orientation="horizontal"
      loop={false}
      aria-label={label}
      value={value}
      // An empty value means the chosen option was clicked again: keep it.
      onValueChange={(v) => {
        const picked = options.find((o) => o === v);
        if (picked) onValueChange(picked);
      }}
      className={`${u.toggleGroup} ${className ?? ""}`}
    >
      {options.map((option, i) => (
        <Radix.Item
          key={option}
          value={option}
          className={`${u.toggleItem} ${optionClassName?.(option) ?? ""}`}
          disabled={isDisabled?.(option)}
          onFocus={() => onValueChange(option)}
        >
          {renderOption(option, i)}
        </Radix.Item>
      ))}
    </Radix.Root>
  );
}
