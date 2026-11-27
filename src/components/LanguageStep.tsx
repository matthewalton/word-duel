"use client";

import { useState } from "react";
import { fill, strings } from "@/i18n/strings";
import { enterHub, setRememberPack, useChosenPack, useRememberPack } from "@/lib/packChoice";
import { askableWords, getPack, listPacks } from "@/packs";
import { Brand } from "./Brand";
import { CheckMark } from "./CheckMark";
import styles from "./game.module.css";
import { Template } from "./LangSpan";
import n from "./nav.module.css";
import { PackFonts, packVars } from "./PackFonts";
import { Button } from "./ui/Button";
import { PortalRoot } from "./ui/PortalRoot";
import { ToggleGroup } from "./ui/ToggleGroup";

const s = strings.nav;

/**
 * The language step (board NavDoorsLanguage): the first screen at `/` until
 * a language is remembered. One tile per pack; CONTINUE switches to the
 * picked pack, keeps or forgets REMEMBER MY LANGUAGE, and opens the hub.
 */
export function LanguageStep() {
  const pack = useChosenPack();
  const packs = listPacks();
  const [picked, setPicked] = useState(pack.meta.id);
  const remembered = useRememberPack();
  const [remember, setRemember] = useState(remembered);
  const bases = new Set(packs.map((p) => p.base.name));
  const [base] = bases;

  const go = () => {
    setRememberPack(remember);
    enterHub(picked);
  };

  return (
    <PortalRoot className={styles.page} style={packVars(pack)}>
      <main className={n.languageStep}>
        <Brand big />
        <div className={n.languageHead}>
          <h1 className={n.languageTitle}>{s.languageHeading}</h1>
          {bases.size === 1 && <p className={n.languageLead}>{fill(s.languageLead, { base })}</p>}
        </div>
        <div className={n.tiles}>
          <ToggleGroup
            label={s.languagesLabel}
            options={packs.map((p) => p.id)}
            value={picked}
            onValueChange={setPicked}
            className={n.tileGroup}
            optionClassName={() => n.tile}
            renderOption={(id) => <PackTile id={id} />}
          />
          <div className={n.moreSoon}>{s.moreSoon}</div>
        </div>
        <div className={n.rememberRow}>
          <label className={n.remember}>
            <input
              type="checkbox"
              className={n.checkInput}
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className={`${n.checkBox} ${n.checkBoxBig}`} aria-hidden="true">
              {remember && <CheckMark />}
            </span>
            <span className={n.rememberText}>
              <span className={n.rememberTitle}>{s.remember}</span>
              <span className={n.rememberNote}>{s.rememberNote}</span>
            </span>
          </label>
          <Button variant="primary" className={n.continue} onClick={go}>
            {s.continue}
          </Button>
        </div>
      </main>
    </PortalRoot>
  );
}

/** One pack's tile: its target language in its own words and font, its name, and a sample word. */
function PackTile({ id }: { id: string }) {
  const pack = getPack(id);
  const { target, base } = pack.meta;
  const [word] = askableWords(pack);
  return (
    <span className={n.tileBody} style={packVars(pack)}>
      <PackFonts pack={pack} />
      <span lang={target.code} dir={target.dir} className={n.tileNative}>
        {target.nativeName}
      </span>
      <span className={n.tileText}>
        <span className={n.tileName}>{target.name.toUpperCase()}</span>
        {word && (
          <span className={n.tileSample}>
            <Template
              text={s.sample}
              values={{
                target: (
                  <span lang={target.code} dir={target.dir}>
                    {word.target}
                  </span>
                ),
                base: (
                  <span lang={base.code} dir={base.dir}>
                    {word.base[0]}
                  </span>
                ),
              }}
            />
          </span>
        )}
      </span>
    </span>
  );
}
