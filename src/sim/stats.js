/** Small-sample statistics for live timing. No external math library. */

export function mean(values) {
  if (!values.length) return null;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

export function median(values) {
  if (!values.length) return null;
  const xs = [...values].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  if (xs.length % 2) return xs[mid];
  return (xs[mid - 1] + xs[mid]) / 2;
}

export function stdev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  let s = 0;
  for (const v of values) {
    const d = v - m;
    s += d * d;
  }
  return Math.sqrt(s / (values.length - 1));
}

/**
 * Standard deviation of a uniform timer quantum of width `resolution`
 * (the spacing between representable timestamps).
 */
export function timerSigma(resolution) {
  if (!(resolution > 0)) return null;
  return resolution / Math.sqrt(12);
}

/**
 * Uncertainty on a per-step quantity when the clock itself is quantized.
 * `elapsed` and `resolution` share a unit; the result is in that unit per step.
 */
export function quantizationUncertaintyPerStep(resolution, steps) {
  if (!(steps > 0)) return null;
  const sigma = timerSigma(resolution);
  if (sigma == null) return null;
  return sigma / steps;
}

export function summarize(values) {
  return {
    n: values.length,
    mean: mean(values),
    median: median(values),
    stdev: stdev(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}
