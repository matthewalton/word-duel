# Pack content is items tested by prompts, kept as validated JSON

To track which words a player is weak at across minigames, a language pack separates **items** (what is learned: a word, or a grammar point such as the object particle 을/를) from **prompts** (one way of asking about an item). A Word Strike round asks about a word item directly; a gap sentence is a prompt that names the one item it tests. Missing 눈 ("eye") in Word Strike and missing it as the blank in a gap sentence therefore count against the same item.

Every item and prompt has an explicit `id`, unique within its pack and never reused. Stats point only at item ids, so fixing a spelling or translation keeps the player's history, and so do reordering the file or moving content to another store. Ids are needed because positions change and target words repeat (눈, 배, 차, 다리 and 병 each have more than one meaning). To retire an item, mark it retired instead of deleting it.

Entries share one envelope (`id`, `kind`, and `tests` on prompts) with a payload per kind (a word has translations, a gap has a sentence, options and an answer). Schemas in `src/packs/` define the envelope and payloads, and a check script enforces them: unique ids, every `tests` pointing to a real item, the answer being one of the options, one blank per sentence, and no unknown fields. Game code reads content only through the pack registry.

## Considered options

- **Content tables in Postgres.** Rejected for now. A table doesn't make entries the same shape: different kinds still need either mostly-null columns or an unchecked `jsonb` payload. It would also mean editing content in the live game (local and production share one database), losing PR review and history, and making every duel depend on the database.
- **A headless CMS** (Payload or Directus on our own Postgres, or a hosted one). The likely path once someone other than a developer edits content, content needs to change without a deploy, or a pack grows past a few thousand entries. The probable shape: write content in the CMS or database, and publish a versioned pack snapshot that the game reads. Stable ids, the shared envelope and the single registry keep that move cheap. Set up a separate development database first.
