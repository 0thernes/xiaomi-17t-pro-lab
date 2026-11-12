/**
 * Bounding-box binning stand-in for a tile binning pass.
 * This is not Mali's tiler and not a trace of Deferred Vertex Shading.
 * A triangle "touches" every bin its axis-aligned bounds overlap.
 */

export function binTriangles({ count, binsX, binsY, random }) {
  const bins = new Uint16Array(binsX * binsY);
  const rng = random || Math.random;
  for (let t = 0; t < count; t++) {
    const xs = [rng(), rng(), rng()];
    const ys = [rng(), rng(), rng()];
    const minx = Math.min(...xs);
    const maxx = Math.max(...xs);
    const miny = Math.min(...ys);
    const maxy = Math.max(...ys);
    const i0 = clamp(Math.floor(minx * binsX), 0, binsX - 1);
    const i1 = clamp(Math.floor(maxx * binsX), 0, binsX - 1);
    const j0 = clamp(Math.floor(miny * binsY), 0, binsY - 1);
    const j1 = clamp(Math.floor(maxy * binsY), 0, binsY - 1);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) bins[j * binsX + i] += 1;
    }
  }
  let touched = 0;
  for (const value of bins) if (value) touched += 1;
  return { bins, touched, binsX, binsY, triangles: count };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
