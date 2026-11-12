import { EUV_LAMBDA_NM } from "./constants.js";
import { binFrequency, fftRadix2 } from "./fft.js";
import { coherentCutoff } from "./rayleigh.js";

/**
 * Discrete Abbe source along one axis. sigma = 0 is fully coherent.
 * Equal weights, not a TSMC or ASML pupil fill. Labeled as such in the UI.
 */
export function abbeSourceOffsets(sigma, points = 7) {
  if (!(sigma > 0)) return [0];
  const count = Math.max(3, points | 1);
  const offsets = [];
  for (let i = 0; i < count; i++) {
    offsets.push(-sigma + (2 * sigma * i) / (count - 1));
  }
  return offsets;
}

/**
 * 1D partially coherent aerial image of a binary line/space mask.
 *
 * Abbe sum: for each source frequency f_s = s·NA/λ, keep mask spectrum
 * bins with |f − f_s| ≤ NA/λ, inverse-transform, and add intensities.
 * A clear field (duty = 1) comes back near intensity 1.
 */
export function aerialImage({
  na,
  pitchNm,
  duty = 0.5,
  lambdaNm = EUV_LAMBDA_NM,
  sigma = 0,
  sourcePoints = 7,
  n = 256,
  periods = 4,
}) {
  if (!(na > 0) || !(pitchNm > 0) || !(lambdaNm > 0)) {
    throw new Error("na, pitch, and lambda must be positive");
  }
  if ((n & (n - 1)) !== 0) throw new Error("n must be a power of two");
  const fieldNm = pitchNm * periods;
  const dx = fieldNm / n;
  const mask = new Float64Array(n);
  const open = duty * pitchNm;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * dx;
    const p = ((x % pitchNm) + pitchNm) % pitchNm;
    mask[i] = p < open ? 1 : 0;
  }

  const fc = coherentCutoff(na, lambdaNm);
  const offsets = abbeSourceOffsets(sigma, sourcePoints);
  const intensity = new Float64Array(n);

  for (const s of offsets) {
    const fShift = (s * na) / lambdaNm;
    const re = Float64Array.from(mask);
    const im = new Float64Array(n);
    fftRadix2(re, im, false);
    for (let k = 0; k < n; k++) {
      const f = binFrequency(k, n, fieldNm);
      if (Math.abs(f - fShift) > fc) {
        re[k] = 0;
        im[k] = 0;
      }
    }
    fftRadix2(re, im, true);
    for (let i = 0; i < n; i++) {
      intensity[i] += re[i] * re[i] + im[i] * im[i];
    }
  }

  const weight = 1 / offsets.length;
  let imax = 0;
  let imin = Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    intensity[i] *= weight;
    if (intensity[i] > imax) imax = intensity[i];
    if (intensity[i] < imin) imin = intensity[i];
    sum += intensity[i];
  }
  const contrast = imax + imin === 0 ? 0 : (imax - imin) / (imax + imin);
  const order1 = 1 / pitchNm;
  return {
    intensity,
    mask,
    fieldNm,
    dxNm: dx,
    contrast,
    imax,
    imin,
    mean: sum / n,
    cutoffPerNm: fc,
    firstOrderPerNm: order1,
    /** On-axis coherent pupil. Oblique source points can pass a higher order. */
    firstOrderPassesCoherent: order1 <= fc + 1e-12,
  };
}

export function michelsonContrast(intensity) {
  let imax = -Infinity;
  let imin = Infinity;
  for (const v of intensity) {
    if (v > imax) imax = v;
    if (v < imin) imin = v;
  }
  if (!(imax + imin)) return 0;
  return (imax - imin) / (imax + imin);
}
