/**
 * Fisher-Yates shuffle — produces an unbiased random permutation in O(n).
 * Returns a NEW array; does not mutate the input.
 */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Return `n` randomly chosen elements from `array`.
 * If the array has fewer than `n` items, all items are returned (shuffled).
 */
export function getRandomSubset(array, n) {
  return shuffle(array).slice(0, n);
}
