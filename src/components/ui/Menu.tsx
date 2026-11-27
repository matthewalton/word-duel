"use client";

import { DropdownMenu as Radix } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { usePortalContainer } from "./PortalRoot";
import u from "./ui.module.css";

/**
 * A button that opens a menu under it. Arrow keys move through the items,
 * Enter picks one, Escape or a click outside closes it and focus goes back
 * to the button.
 */
export function Menu({
  trigger,
  label,
  describedBy,
  align,
  open,
  onOpenChange,
  className,
  children,
}: {
  /** The opening button, usually a Button; it gets the menu's aria wiring. */
  trigger: ReactNode;
  /** The menu's accessible name. */
  label: string;
  /** Id of a line inside the menu that describes it, read with its name. */
  describedBy?: string;
  /** Which edge of the button the menu lines up with. */
  align: "start" | "end";
  /** Set both to control it; otherwise the menu keeps its own open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Width, padding and gap for this menu. */
  className?: string;
  children: ReactNode;
}) {
  const container = usePortalContainer();
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal container={container}>
        <Radix.Content
          aria-label={label}
          aria-describedby={describedBy}
          align={align}
          sideOffset={12}
          collisionPadding={16}
          className={`${u.panel} ${u.menu} ${className ?? ""}`}
        >
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

/** One thing to pick. With asChild, it styles a Link or Button as the item. */
export function MenuItem({ className, ...props }: ComponentProps<typeof Radix.Item>) {
  return <Radix.Item className={`${u.menuItem} ${className ?? ""}`} {...props} />;
}

/** Items that belong together, named by a MenuLabel's id (aria-labelledby). */
export function MenuGroup(props: ComponentProps<typeof Radix.Group>) {
  return <Radix.Group {...props} />;
}

/** A heading inside the menu; not an item, so arrow keys pass over it. */
export function MenuLabel(props: ComponentProps<typeof Radix.Label>) {
  return <Radix.Label {...props} />;
}

/** A set of items of which one is the current choice (the language picker). */
export function MenuRadioGroup(props: ComponentProps<typeof Radix.RadioGroup>) {
  return <Radix.RadioGroup {...props} />;
}

export function MenuRadioItem({ className, ...props }: ComponentProps<typeof Radix.RadioItem>) {
  return <Radix.RadioItem className={`${u.menuItem} ${className ?? ""}`} {...props} />;
}

/** An item that switches a setting on or off (REMEMBER ON THIS DEVICE); data-state is checked or unchecked. */
export function MenuCheckboxItem({ className, ...props }: ComponentProps<typeof Radix.CheckboxItem>) {
  return <Radix.CheckboxItem className={`${u.menuItem} ${className ?? ""}`} {...props} />;
}
