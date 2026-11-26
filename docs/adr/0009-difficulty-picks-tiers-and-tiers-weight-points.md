# Difficulty picks which tiers a duel draws, and harder items are worth more points

Each item in a language pack has a **tier** from 1 (easiest) to 3 (hardest), set in the pack JSON (ADR 0001). The player picks a **difficulty** on the title screen before a duel, and it decides which tiers the duel draws from. Tiers are cumulative: Easy draws tier 1, Normal tiers 1–2, Hard every tier. Hard still asks easy words, so every pool stays large.

A right answer is worth `pointsPerHit × tier`, so 10, 20 or 30 points before the combo multiplier. There is still one best score per pack and minigame, not one per difficulty: a harder duel scores more because it asks harder items, which rewards picking Hard without splitting bests.

Difficulty does not change the fuse; the fuse still shortens only by stage.

For the Korean pack, tiers come from the grade in the list the words were already chosen from, 국립국어원's *한국어 학습용 어휘 목록* (2003): grade A is tier 1, B is tier 2, C is tier 3. The pack's existing 424 words are all grade A, so tier 2 and 3 words are added from grades B and C: frequent nouns with a clear English equivalent, leaving out abstract or awkward ones (-적 adjective-nouns, homographs that need context). Their English answers are drafted by hand and reviewed.

Verbs and adjectives come from the same list by the same rule (grade A, B, C → tier 1, 2, 3): frequent ones with a clear English equivalent, leaving out noun + 하다 verbs whose noun is already in the pack and words that need context to translate. The Korean is the dictionary form (먹다, 크다). Verbs' English answers are written with "to" ("to eat") so a base → target prompt reads as a verb; adjectives' are bare ("big"). The pack's matching settings ignore a leading "to", "be" or "to be" when checking an answer, so "eat", "to eat", "big" and "be big" all count, but keep it when grouping words by prompt, so the verb "to sleep" (자다) and the noun "sleep" (잠) stay different prompts.

For the Spanish pack, no openly licensed graded list exists, so tiers come from frequency bands in an openly licensed frequency list: hermitdave's FrequencyWords (Spanish, from OpenSubtitles 2018, CC BY-SA 4.0). The list counts word forms, not lemmas, so a word's rank is the rank of its most frequent form (the infinitive or a common conjugation for a verb, the singular or plural for a noun, any gender or number for an adjective), skipping forms that are also another common word ("camino" for caminar, "cara" for caro). A rank in the top 1,000 is tier 1, 1,001–3,000 tier 2, 3,001–6,000 tier 3. Words are picked from each band for a clear English equivalent, about 250, 150 and 100 of them. Nouns are shown with their article (el gato), verbs as the infinitive (comer) with English answers written "to eat", adjectives in the masculine singular (rojo).

Word Strike and Gap Guard both offer a difficulty, and it is one setting shared by the two: picking Hard on one leaves the other on Hard too. A gap takes the tier of the item it tests: a grammar gap the grammar point's tier, a noun or verb gap its word's tier. Sentence length doesn't count, for the same reason word length doesn't (below).

Grammar points have no graded list like the words do, so their tiers are set by hand in the order a first-year Korean course teaches them: the core particles (이/가, 을/를, 은/는, 도), 예요/이에요, the polite present and the counters 개 and 명 are tier 1; place particles, 와/과, the past, -고 싶어요, -지 않아요 and the counters 살, 잔, 병 and 마리 tier 2; 에게/한테, (으)로, -(으)ㄹ 거예요 and the counters 권 and 장 tier 3.

## Considered options

- **Difficulty only ramps by stage.** Rejected: the player wanted to choose. The fuse already ramps by stage.
- **Exclusive tiers** (Hard asks only tier 3). Rejected: each pool would be a third of the pack, and leaving out easy words isn't what makes a duel hard.
- **One best score per difficulty.** Rejected: weighting points by tier keeps one best meaningful, and needs no change to how bests are stored.
- **Splitting the existing grade-A words by the list's frequency rank.** Rejected: "hard" words would still be beginner nouns.
- **Word length as difficulty.** Rejected: a poor proxy (물 and 고양이 are both beginner words).
- **Spanish tiers by the dictionary form's own rank.** Rejected: an infinitive is rarer than its conjugations, so everyday verbs such as gustar would land in tier 3.
- **Spanish tiers by summing every form of a word.** Rejected: a verb has dozens of forms and a noun two, so verbs would crowd tier 1.
- **Weighting draws toward past misses.** Out of scope here; difficulty comes from pack data only.
