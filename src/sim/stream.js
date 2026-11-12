/**
 * STREAM-style kernels (McCalpin): Copy, Scale, Add, Triad.
 * Byte counts follow STREAM: each array element that is read or written counts.
 * The result is bandwidth of these typed arrays in this browser, not LPDDR5X.
 */

export function copyKernel(a, b) {
  for (let i = 0; i < a.length; i++) a[i] = b[i];
}

export function scaleKernel(a, b, scalar) {
  for (let i = 0; i < a.length; i++) a[i] = scalar * b[i];
}

export function addKernel(a, b, c) {
  for (let i = 0; i < a.length; i++) a[i] = b[i] + c[i];
}

export function triadKernel(a, b, c, scalar) {
  for (let i = 0; i < a.length; i++) a[i] = b[i] + scalar * c[i];
}

/** Bytes moved by each kernel for `n` elements of `elemBytes`. */
export function streamBytes(n, elemBytes = 8) {
  const e = n * elemBytes;
  return {
    copy: 2 * e,
    scale: 2 * e,
    add: 3 * e,
    triad: 3 * e,
  };
}

export function gibPerSecond(bytes, elapsedMs) {
  if (!(elapsedMs > 0)) return null;
  return bytes / (elapsedMs * 1e-3) / 1e9;
}

/**
 * Theoretical peak if the bus width were known.
 * rateMbps is the data rate per pin. widthBits is unpublished for this phone,
 * so callers should pass null and show UNKNOWN rather than assume 64.
 */
export function theoreticalDramGBps(rateMbps, widthBits) {
  if (rateMbps == null || widthBits == null) return null;
  if (!(widthBits > 0) || !(rateMbps > 0)) return null;
  // Mbps per pin × pins / 8 = MB/s, then / 1000 for GB/s (decimal, STREAM-style).
  return (rateMbps * widthBits) / 8 / 1000;
}
