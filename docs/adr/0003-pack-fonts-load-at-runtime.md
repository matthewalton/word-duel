# Pack fonts load from Google Fonts at runtime, not through next/font

`next/font` needs a static import per font in code, which would put pack-specific font names (e.g. Jua, Gowun Dodum) into components and break ADR 0001. Pack fonts are therefore declared in each pack's `meta.json` and loaded with a Google Fonts stylesheet link built from that data. Only the pack-independent UI font (Pixelify Sans) uses `next/font`. The cost is a request to Google Fonts and no self-hosting for pack fonts, which is acceptable for a local-only app.
