/**
 * Compute DNA similarity between two DNA objects.
 * Returns a normalized 0–1 score (1 = identical).
 */
export function computeDNASimilarity(dnaA, dnaB) {
  if (!dnaA || !dnaB) return 0;
  let diff = 0;
  const keys = new Set([...Object.keys(dnaA), ...Object.keys(dnaB)]);
  keys.forEach(k => { diff += Math.abs((dnaA[k] || 5) - (dnaB[k] || 5)); });
  return Math.max(0, 1 - diff / (keys.size * 10));
}

// Legacy alias kept for any existing callers
export const getDNASimilarity = (a, b) => computeDNASimilarity(a, b) * 100;
