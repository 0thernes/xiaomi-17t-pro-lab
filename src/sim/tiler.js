/**
 * Software tile binning and shading.
 * Triangles are binned by the tiles their bounding box touches, then shaded
 * with a barycentric test into a framebuffer. This is a live renderer, not a
 * trace of Mali Deferred Vertex Shading and not a display of a pre-drawn image.
 */

export function rasterizeTiles(triangles, { width, height, tileSize }) {
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  const bins = Array.from({ length: tilesX * tilesY }, () => []);
  const framebuffer = new Uint8ClampedArray(width * height * 4);
  let shaded = 0;

  triangles.forEach((tri, index) => {
    const minX = clamp(Math.floor(Math.min(tri.x0, tri.x1, tri.x2)), 0, width - 1);
    const maxX = clamp(Math.floor(Math.max(tri.x0, tri.x1, tri.x2)), 0, width - 1);
    const minY = clamp(Math.floor(Math.min(tri.y0, tri.y1, tri.y2)), 0, height - 1);
    const maxY = clamp(Math.floor(Math.max(tri.y0, tri.y1, tri.y2)), 0, height - 1);
    const i0 = Math.floor(minX / tileSize);
    const i1 = Math.floor(maxX / tileSize);
    const j0 = Math.floor(minY / tileSize);
    const j1 = Math.floor(maxY / tileSize);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) bins[j * tilesX + i].push(index);
    }
  });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = Math.floor(y / tileSize) * tilesX + Math.floor(x / tileSize);
      for (const index of bins[tile]) {
        const tri = triangles[index];
        if (!covers(tri, x + 0.5, y + 0.5)) continue;
        const pixel = (y * width + x) * 4;
        framebuffer[pixel] = tri.r;
        framebuffer[pixel + 1] = tri.g;
        framebuffer[pixel + 2] = tri.b;
        framebuffer[pixel + 3] = 255;
        shaded += 1;
        break;
      }
    }
  }

  let touched = 0;
  for (const bin of bins) if (bin.length) touched += 1;
  return { framebuffer, bins, tilesX, tilesY, shaded, touched, width, height, tileSize };
}

function covers(tri, x, y) {
  const area = edge(tri.x0, tri.y0, tri.x1, tri.y1, tri.x2, tri.y2);
  if (area === 0) return false;
  const w0 = edge(tri.x1, tri.y1, tri.x2, tri.y2, x, y) / area;
  const w1 = edge(tri.x2, tri.y2, tri.x0, tri.y0, x, y) / area;
  const w2 = edge(tri.x0, tri.y0, tri.x1, tri.y1, x, y) / area;
  return w0 >= 0 && w1 >= 0 && w2 >= 0;
}

function edge(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
