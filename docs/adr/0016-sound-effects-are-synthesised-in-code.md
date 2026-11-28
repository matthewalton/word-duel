# Sound effects are synthesised in code

Duels have **sound effects** (#86): short chiptune sounds for the countdown, a right answer, a heart breaking, the fuse's last ticks, a stage clear, a comeback, winning and losing, and in versus the rival joining, the rival striking first and a wrong answer locking you out. There is no music (ADR 0004).

Every sound is made with the Web Audio API at the moment it plays, from a pure table of notes (`src/lib/soundBank.ts`): square and triangle oscillators, plus a short fixed-seed noise burst for a heart's crack, each with a 5 ms rise and 30 ms fall, through one master gain at 0.2 in one `AudioContext` per page. Nothing is downloaded, nothing is licensed and nothing is added to `package.json`, so ADR 0015 is met trivially. Which sound plays when is a pure function of what the duel shows (`duelSounds` in `src/game/duelSounds.ts`), called from one hook per duel screen; the reducer and the controllers' timing don't know sound exists. Each sound is shorter than the pause after its event, so sounds never run into each other without any queue.

Sound is **on by default**. Browsers stay silent until the page's first tap, click or key press anyway, so audio unlocks on that gesture; sounds before it, in a hidden tab or with sound off are dropped, never queued. On an iPhone the audio session is set to ambient, so the silent switch mutes the game and the player's own music keeps playing. The **sound button** (a pixel speaker in the top bar and on the duel's bar) turns it off, and the choice is kept in this browser like the language picker (ADR 0011): a setting, not progress, so it works for guests and ADR 0008 holds.

## Considered options

- **CC0 sound packs or commissioned audio files.** Rejected: files to host and load, licences to track, and a look that is harder to keep consistent than notes in a table a test can check.
- **A library (Tone.js, Howler).** Rejected: a dependency for a dozen short sounds that `OscillatorNode` and `GainNode` already make.
- **A volume slider.** Rejected: it needs a popover or a settings screen and a second stored value; the device volume does the job and the master level is low.
- **Off by default.** Rejected: most players would never find the feature, and the browser's gesture rule, the iPhone silent switch and the button on every screen already keep it from surprising anyone.
- **Keeping the setting on the account.** Deferred, as for the language picker: a schema change that only helps players on several devices.
