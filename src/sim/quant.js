/** Seeded RNG so tests and the lab can replay a matrix. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fillUnit(length, rng) {
  const out = new Float64Array(length);
  for (let i = 0; i < length; i++) out[i] = rng() * 2 - 1;
  return out;
}

/** Symmetric int8 quantization. scale = max(|x|) / 127. */
export function quantizeSymmetricInt8(values) {
  let max = 0;
  for (let i = 0; i < values.length; i++) max = Math.max(max, Math.abs(values[i]));
  const scale = max === 0 ? 1 : max / 127;
  const q = new Int8Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let r = Math.round(values[i] / scale);
    if (r > 127) r = 127;
    if (r < -127) r = -127;
    q[i] = r;
  }
  return { q, scale };
}

/**
 * BitNet-style absmean ternarization.
 * gamma = mean(|W|), weight → clip(round(W / gamma), −1, 1).
 * Information per ternary weight is log2(3) ≈ 1.585 bits.
 * This is the published quantization idea, run in JS, not on NPU 990.
 */
export function ternarizeAbsMean(values) {
  let acc = 0;
  for (let i = 0; i < values.length; i++) acc += Math.abs(values[i]);
  const gamma = values.length ? acc / values.length : 1;
  const denom = gamma === 0 ? 1 : gamma;
  const q = new Int8Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let r = Math.round(values[i] / denom);
    if (r > 1) r = 1;
    if (r < -1) r = -1;
    q[i] = r;
  }
  return { q, scale: gamma, bitsPerWeight: Math.log2(3) };
}

export function matmulFp(A, B, n) {
  const C = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const aik = A[i * n + k];
      const row = i * n;
      for (let j = 0; j < n; j++) C[row + j] += aik * B[k * n + j];
    }
  }
  return C;
}

/** Integer matrix product of int8 factors, then dequantized by scaleA * scaleB. */
export function matmulQuantized(Aq, scaleA, Bq, scaleB, n) {
  const C = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const aik = Aq[i * n + k];
      const row = i * n;
      for (let j = 0; j < n; j++) C[row + j] += aik * Bq[k * n + j];
    }
  }
  const scale = scaleA * scaleB;
  for (let i = 0; i < C.length; i++) C[i] *= scale;
  return C;
}

export function rmse(a, b) {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("rmse inputs must be non-empty and the same length");
  }
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s / a.length);
}

export function maxAbsErr(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

/** FLOPs in a square matmul, counting one multiply and one add per product. */
export function matmulFlops(n) {
  return 2 * n * n * n;
}
