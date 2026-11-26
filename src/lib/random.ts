export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** How often missed items are dealt while any are left in a pass: one round in this many. */
export const MISSED_EVERY = 3;

/**
 * Shuffles items with the missed ones worked in early (ADR 0010): each block
 * of `MISSED_EVERY` rounds deals one missed item, at a random place in the
 * block, until every missed item is dealt; the rest follow in a plain shuffle.
 * With nothing missed this is a plain shuffle.
 */
export function weave<T>(items: readonly T[], isMissed: (item: T) => boolean): T[] {
  const missed = shuffle(items.filter(isMissed));
  const rest = shuffle(items.filter((item) => !isMissed(item)));
  const out: T[] = [];
  while (missed.length > 0 && rest.length > 0) {
    const block = rest.splice(0, MISSED_EVERY - 1);
    block.splice(Math.floor(Math.random() * (block.length + 1)), 0, missed.shift() as T);
    out.push(...block);
  }
  return [...out, ...missed, ...rest];
}

export interface Draw<T> {
  /** Deals the next item. */
  next: () => T;
  /**
   * Works missed items in early from now on: the rest of this pass is
   * re-dealt with them woven in, and so is every later pass. Items already
   * dealt this pass don't come back.
   */
  workIn: (isMissed: (item: T) => boolean) => void;
}

const noneMissed = () => false;

/**
 * Deals a pool in a shuffled draw order: nothing comes back until the whole
 * pool has been dealt, then the pool is reshuffled, never starting with the
 * one just dealt. Missed items, once known, are worked in early in each pass
 * (`weave`).
 */
export function drawOrder<T>(pool: readonly T[], isMissed: (item: T) => boolean = noneMissed): Draw<T> {
  if (pool.length === 0) throw new Error("drawOrder needs a non-empty pool");
  let missed = isMissed;
  let order: T[] = [];
  let last: T | undefined;
  return {
    next: () => {
      if (order.length === 0) {
        order = weave(pool, missed);
        // No back-to-back repeat across a reshuffle. Swap with one of the
        // same kind (missed or not) where possible, to keep the weave.
        if (order.length > 1 && order[0] === last) {
          const others = order.map((_, i) => i).slice(1);
          const alike = others.filter((i) => missed(order[i]) === missed(order[0]));
          const from = alike.length > 0 ? alike : others;
          const swap = from[Math.floor(Math.random() * from.length)];
          [order[0], order[swap]] = [order[swap], order[0]];
        }
      }
      last = order.shift() as T;
      return last;
    },
    workIn: (isMissedNow) => {
      missed = isMissedNow;
      order = weave(order, missed);
    },
  };
}
