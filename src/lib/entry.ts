/** The first screen at `/`: the language step, or straight to the hub. */
export type Entry = "language" | "hub";

/**
 * Which screen `/` opens on a fresh page load: the hub only when the player
 * has picked a language before and asked to remember it on this device.
 */
export function entryFor(rememberPack: boolean, packStored: boolean): Entry {
  return rememberPack && packStored ? "hub" : "language";
}
