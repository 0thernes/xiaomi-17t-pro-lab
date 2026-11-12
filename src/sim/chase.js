/**
 * Dependency-chain pointer chase.
 * Each node is one cache line (64 bytes). The successor index is stored in
 * the first Uint32 of the line, so the next load depends on the current one.
 * A Sattolo shuffle makes a single cycle, which is hostile to a stride prefetcher.
 */

export const CACHE_LINE_BYTES = 64;

export function buildChase(bytes, random = Math.random) {
  const wordsPerLine = CACHE_LINE_BYTES / 4;
  const n = Math.max(2, Math.floor(bytes / CACHE_LINE_BYTES));
  const buf = new Uint32Array(n * wordsPerLine);
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  // Sattolo: a single n-cycle.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * i);
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  for (let i = 0; i < n; i++) {
    const from = order[i] * wordsPerLine;
    const to = order[(i + 1) % n] * wordsPerLine;
    buf[from] = to;
  }
  return { buf, nodes: n, start: order[0] * wordsPerLine, bytes: n * CACHE_LINE_BYTES };
}

/** Chase `steps` dependent loads. Returns the final index so the loop stays live. */
export function chase(buf, start, steps) {
  let i = start;
  for (let s = 0; s < steps; s++) i = buf[i];
  return i;
}

/** How many distinct nodes are on the cycle that starts at `start`. */
export function cycleLength(buf, start) {
  const seen = new Set();
  let i = start;
  while (!seen.has(i)) {
    seen.add(i);
    i = buf[i];
    if (seen.size > buf.length) break;
  }
  return seen.size;
}

/**
 * Time a chase until the elapsed wall clock clears several timer quanta.
 * `now` is injectable for tests. Returns ns/load plus the step count used.
 */
export function timeChase(built, { now = () => performance.now(), minElapsedMs = 40, maxSteps = 8e7 } = {}) {
  const { buf, start, nodes } = built;
  // Warm the lines once.
  chase(buf, start, Math.min(nodes, 20000));
  let steps = Math.max(nodes, 1000);
  let elapsed = 0;
  let sink = 0;
  while (steps <= maxSteps) {
    const t0 = now();
    sink = chase(buf, start, steps);
    elapsed = now() - t0;
    if (elapsed >= minElapsedMs) break;
    steps = Math.min(maxSteps, steps * 2);
    if (steps === maxSteps && elapsed < minElapsedMs) break;
  }
  const nsPerLoad = elapsed > 0 ? (elapsed * 1e6) / steps : null;
  return { steps, elapsedMs: elapsed, nsPerLoad, sink, nodes };
}

/** Largest consecutive rise in ns/load. A hint, not a named cache hit. */
export function largestStep(points) {
  let best = null;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].nsPerLoad;
    const cur = points[i].nsPerLoad;
    if (!(prev > 0) || cur == null) continue;
    const jump = cur / prev;
    if (!best || jump > best.jump) {
      best = { jump, from: points[i - 1], to: points[i] };
    }
  }
  return best;
}
