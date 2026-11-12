/** In-place radix-2 complex FFT. Forward is unnormalized; inverse divides by n. */

export function fftRadix2(re, im, inverse = false) {
  const n = re.length;
  if (im.length !== n || n < 2 || (n & (n - 1)) !== 0) {
    throw new Error("FFT length must be a power of two and re/im must match");
  }
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const k = i + j + half;
        const vRe = re[k] * wRe - im[k] * wIm;
        const vIm = re[k] * wIm + im[k] * wRe;
        const uRe = re[i + j];
        const uIm = im[i + j];
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[k] = uRe - vRe;
        im[k] = uIm - vIm;
        const nextRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/** Frequency of bin k in cycles per unit length. `span` is the field length. */
export function binFrequency(k, n, span) {
  const kk = k <= n / 2 ? k : k - n;
  return kk / span;
}
