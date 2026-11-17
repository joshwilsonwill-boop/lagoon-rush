// A small seeded random source (mulberry32) so a ?seed=N run always plays the
// same lagoon: the same drift, the same shells, the same near misses.

export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
