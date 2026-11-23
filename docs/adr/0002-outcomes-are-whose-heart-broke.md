# Outcomes record whose heart broke, not whether the answer was right

The duel reducer takes `{ loser: "you" | "rival", reason }` rather than "correct / incorrect". In solo play the client decides (right answer → rival loses a heart), but in the planned versus mode a server will decide whose correct answer arrived first, and that result arrives as "the other player won this round". Modelling outcomes this way lets a versus controller feed server results into the same reducer, minigames and screen; only the solo controller (`useDuel`: fuse timer, CPU rival) gets replaced.
