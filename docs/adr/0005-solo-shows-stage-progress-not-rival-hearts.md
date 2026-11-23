# Solo play shows stage progress, not the CPU's hearts

In solo play a row of CPU hearts made the duel look like a fight against a character, when really the player is climbing stages that speed up. The duel screen now draws the rival's hearts as **stage progress**: a thin bar of chunks under the header, one chunk per right answer still needed. The player's own hearts stay as hearts.

Only the drawing changes. The reducer still counts both sides' hearts and outcomes still say whose heart broke (ADR 0002), so the planned versus mode can draw the other player's hearts again from the same state.
