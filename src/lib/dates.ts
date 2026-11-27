import { strings, UI_LANG } from "@/i18n/strings";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between a date and today, by the player's local calendar. */
export function daysSince(d: Date): number {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.max(0, Math.round((day(new Date()) - day(d)) / DAY_MS));
}

/** TODAY, or the day and short month ("26 NOV"). */
export function dateText(d: Date): string {
  if (daysSince(d) === 0) return strings.wordbook.today;
  return new Intl.DateTimeFormat(UI_LANG, { day: "numeric", month: "short" }).format(d).toUpperCase();
}
