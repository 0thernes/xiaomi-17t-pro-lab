import { median } from "./stats.js";

/**
 * Estimate the spacing of performance.now().
 * `now` is injectable. A tight loop records positive deltas until `budgetMs`.
 */
export function probeTimer(now, budgetMs = 40) {
  const clock = now || (() => performance.now());
  const deltas = [];
  let prev = clock();
  const start = prev;
  let guard = 0;
  while (deltas.length < 24 && guard < 100000) {
    guard += 1;
    const t = clock();
    const d = t - prev;
    if (d > 0) {
      deltas.push(d);
      prev = t;
    }
    if (t - start >= budgetMs) break;
  }
  deltas.sort((a, b) => a - b);
  const isolated = typeof crossOriginIsolated === "boolean" ? crossOriginIsolated : false;
  return {
    samples: deltas.length,
    minDeltaMs: deltas[0] ?? null,
    medianDeltaMs: deltas.length ? median(deltas) : null,
    isolated,
    /** Chrome's documented explicit-timer class. Not a measurement of this call. */
    citedClassUs: isolated ? 5 : 100,
  };
}
