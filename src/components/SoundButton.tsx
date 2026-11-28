"use client";

import { useEffect } from "react";
import { strings } from "@/i18n/strings";
import { armUnlock, setSoundOn } from "@/lib/sound";
import { useSoundOn } from "@/lib/soundSetting";
import { SpeakerIcon } from "./SpeakerIcon";
import n from "./nav.module.css";
import { Button } from "./ui/Button";

/**
 * The sound button: turns the duel's sound effects on or off in this browser
 * (ADR 0016). Its name never changes; `aria-pressed` says whether sound is on.
 * A click doesn't take focus, so muting mid-round leaves the cursor in the
 * answer field. Size and place come from the bar it sits in.
 */
export function SoundButton({ className }: { className: string }) {
  const on = useSoundOn();
  useEffect(armUnlock, []);

  return (
    <Button
      variant="icon"
      className={`${n.soundButton} ${className}`}
      aria-label={strings.sound.buttonAria}
      aria-pressed={on}
      title={on ? strings.sound.on : strings.sound.off}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setSoundOn(!on)}
    >
      <SpeakerIcon on={on} className={n.soundIcon} />
    </Button>
  );
}
