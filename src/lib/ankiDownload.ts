import type { SqlJsStatic } from "sql.js";
import type { LanguagePack } from "../packs/types.ts";
import { ankiFileName, type ExportEntry } from "./ankiExport.ts";

/**
 * SQLite's wasm for sql.js, a committed copy of the installed package's
 * `dist/sql-wasm-browser.wasm` named for its version (a test keeps them equal).
 */
export const SQL_WASM_URL = "/vendor/sql.js/sql-wasm-1.17.0.wasm";

/** sql.js once loaded this visit; cleared on failure so the next tap loads again. */
let sqlLoad: Promise<SqlJsStatic> | null = null;

function loadSql(): Promise<SqlJsStatic> {
  if (sqlLoad) return sqlLoad;
  // The wasm is fetched here rather than by sql.js, which keeps a failed
  // load for the rest of the visit: initSqlJs only runs once the bytes are in.
  const load = Promise.all([import("sql.js"), fetchWasm()]).then(([{ default: initSqlJs }, wasmBinary]) =>
    initSqlJs({ wasmBinary }),
  );
  sqlLoad = load;
  load.catch(() => {
    if (sqlLoad === load) sqlLoad = null;
  });
  return load;
}

async function fetchWasm(): Promise<ArrayBuffer> {
  const response = await fetch(SQL_WASM_URL);
  if (!response.ok) throw new Error(`${SQL_WASM_URL}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

/**
 * Builds the Anki export as an `.apkg` in the browser and saves it. The deck
 * writer and sql.js are loaded only here, on the first export of a visit, so
 * no page's first load carries them. Throws if loading or building fails.
 */
export async function exportAnkiDeck(pack: LanguagePack, entries: readonly ExportEntry[], now: Date) {
  const [{ buildApkg }, SQL] = await Promise.all([import("./ankiPackage.ts"), loadSql()]);
  const bytes = await buildApkg(pack, entries, now, SQL);
  // Copied into a plain ArrayBuffer, which is what a Blob takes.
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
  download({ fileName: ankiFileName(pack, now), blob });
}

/** Saves a file through the browser's own download. */
function download({ fileName, blob }: { fileName: string; blob: Blob }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  // Revoked once the click has handed the file to the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
