"use client";

import { Dialog as Radix } from "radix-ui";
import { useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { usePortalContainer } from "./PortalRoot";
import u from "./ui.module.css";

/**
 * A modal panel, open while mounted. Escape, a click outside and the ×
 * button call onClose; focus stays inside while it is open and goes back to
 * the control that opened it.
 */
export function Dialog({
  title,
  lead,
  closeLabel,
  onClose,
  className,
  children,
}: {
  title: string;
  /** A line beside the title, in the header. */
  lead?: ReactNode;
  /** The × button's aria-label. */
  closeLabel: string;
  onClose: () => void;
  /** Width, gap and frame colour for this dialog. */
  className?: string;
  children: ReactNode;
}) {
  const container = usePortalContainer();
  // Radix only hands focus back to its own trigger; these dialogs are opened
  // by plain buttons (or the V key), so remember what had focus instead.
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Radix.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Radix.Portal container={container}>
        <Radix.Overlay className={u.overlay}>
          <Radix.Content
            className={`${u.panel} ${u.dialog} ${className ?? ""}`}
            aria-describedby={undefined}
            onOpenAutoFocus={() => {
              // Runs before focus moves in, so this is still the opener.
              opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              opener.current?.focus();
            }}
          >
            <div className={u.dialogHead}>
              <Radix.Title className={u.dialogTitle}>{title}</Radix.Title>
              {lead}
              <Radix.Close asChild>
                <Button variant="icon" className={u.dialogClose} aria-label={closeLabel}>
                  ×
                </Button>
              </Radix.Close>
            </div>
            {children}
          </Radix.Content>
        </Radix.Overlay>
      </Radix.Portal>
    </Radix.Root>
  );
}
