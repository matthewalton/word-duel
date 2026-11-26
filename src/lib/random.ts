export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deals a pool in a shuffled draw order: nothing comes back until the whole
 * pool has been dealt, then the pool is reshuffled, never starting with the
 * one just dealt. A later weighting (asking weak items more often) would
 * replace the plain shuffle here.
 */
export function drawOrder<T>(pool: readonly T[]): () => T {
  if (pool.length === 0) throw new Error("drawOrder needs a non-empty pool");
  let order: T[] = [];
  let last: T | undefined;
  return () => {
    if (order.length === 0) {
      order = shuffle(pool);
      // No back-to-back repeat across a reshuffle.
      if (order.length > 1 && order[0] === last) {
        const swap = 1 + Math.floor(Math.random() * (order.length - 1));
        [order[0], order[swap]] = [order[swap], order[0]];
      }
    }
    last = order.shift() as T;
    return last;
  };
}
