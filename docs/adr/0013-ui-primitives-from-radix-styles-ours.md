# UI primitives come from Radix, styles stay ours

Screens are built from a small shared set in `src/components/ui/`: **Button**, **Dialog**, **Menu**, **Toggle group** and **Panel**. Dialog, Menu and Toggle group wrap Radix Primitives (the single `radix-ui` package); Button and Panel are our own, since Radix has no button and a panel is only a box. Each piece is added by the first screen that needs it, never ahead of a caller (#61 moved the title screen; the duel and versus screens and the Wordbook follow in #66 and #67).

**Radix gives the behaviour.** A dialog traps focus while open, closes on Escape, a click outside or its × button, and hands focus back to the control that opened it. A menu moves through its items with the arrow keys, picks with Enter and closes on Escape or a click outside. A toggle group moves along its options with the arrow keys like radio buttons. Before this, each screen wrote its own open state, outside-click and key handling for its two menus, and used native `<dialog>` with `showModal()` for its four dialogs; Radix Dialog replaces those (`docs/standards.md` §5).

**The look stays ours.** The pieces carry no Radix theme: they are styled in `ui.module.css` with the pixel rules and tokens (`--s`, `--px`, 4px borders, unblurred offset shadows, no eased motion) and copy the look the screens already had. Every control shares one pixel focus ring. Those styles sit in a CSS `ui` layer above the `base` reset layer, so a screen's own class always wins for sizes, placement and one-off colours. Dialogs and menus render into the page's root element (`PortalRoot`), not the document body, so they keep the pack's font variables. The two fonts (standards §6) and the rule that all copy lives in `src/i18n/strings.ts` are unchanged: the pieces take text as props and contain none of their own.

## Considered options

- **Keep hand-built menus and native `<dialog>`.** Rejected: every screen repeated the same open state, focus and key code, and the menus missed arrow-key movement and screen-reader roles.
- **A styled component library (shadcn/ui, MUI, Chakra).** Rejected: their look would have to be undone to get back to pixel art, and they bring rounded corners, soft shadows and eased motion we don't use.
- **Separate `@radix-ui/react-*` packages.** Rejected for the single `radix-ui` package: tree-shaken just the same, and one version to keep current.
