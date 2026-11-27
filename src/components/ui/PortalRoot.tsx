"use client";

import { createContext, useContext, useState, type ComponentProps } from "react";

const PortalContainer = createContext<HTMLElement | null>(null);

/**
 * The element dialogs and menus open into. They render outside the screen's
 * layout, but inside this element they keep the pack's font variables
 * (`--font-words`) that the page sets on it.
 */
export function PortalRoot(props: ComponentProps<"div">) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return (
    <PortalContainer value={root}>
      <div ref={setRoot} {...props} />
    </PortalContainer>
  );
}

/** Where to portal to; null (before the root mounts) means the document body. */
export const usePortalContainer = () => useContext(PortalContainer);
