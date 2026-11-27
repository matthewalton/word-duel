/**
 * The secret that holds this tab's seat in a versus room, kept for the tab
 * only (sessionStorage), so a reload keeps the seat and two windows can be
 * two players. Storage can be missing or blocked: then the seat lasts until
 * the page closes.
 */
const KEY = (code: string) => `word-duel:versus:${code}`;
const held = new Map<string, string>();

export function readSeat(code: string): string | null {
  if (held.has(code)) return held.get(code)!;
  try {
    return window.sessionStorage.getItem(KEY(code));
  } catch {
    return null;
  }
}

export function keepSeat(code: string, token: string) {
  held.set(code, token);
  try {
    window.sessionStorage.setItem(KEY(code), token);
  } catch {
    // Blocked storage: the seat is kept in memory for this page load.
  }
}
