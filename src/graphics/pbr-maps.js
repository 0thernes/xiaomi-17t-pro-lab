import * as THREE from "three";

function canvasTex(canvas, repeatX, repeatY) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  return texture;
}

/** Vertical brush lines. Normal and roughness are original, not a scanned plate. */
export function brushMaps() {
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = 16;
  normalCanvas.height = 256;
  const normalCtx = normalCanvas.getContext("2d");
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = 16;
  roughCanvas.height = 256;
  const roughCtx = roughCanvas.getContext("2d");
  for (let y = 0; y < 256; y++) {
    const groove = (y * 13) % 5;
    normalCtx.fillStyle = `rgb(${128 + (groove - 2) * 10},128,250)`;
    normalCtx.fillRect(0, y, 16, 1);
    const rough = 55 + groove * 22;
    roughCtx.fillStyle = `rgb(${rough},${rough},${rough})`;
    roughCtx.fillRect(0, y, 16, 1);
  }
  return {
    normal: canvasTex(normalCanvas, 2, 36),
    rough: canvasTex(roughCanvas, 2, 36),
  };
}

/** Fine random microfacet field for AG glass. Original noise, not a photo. */
export function agMaps() {
  const size = 128;
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext("2d");
  const heights = roughCtx.createImageData(size, size);
  let seed = 23;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < heights.data.length; i += 4) {
    const v = 100 + Math.floor(rnd() * 70);
    heights.data[i] = heights.data[i + 1] = heights.data[i + 2] = v;
    heights.data[i + 3] = 255;
  }
  roughCtx.putImageData(heights, 0, 0);
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = normalCanvas.height = size;
  const normalCtx = normalCanvas.getContext("2d");
  const normals = normalCtx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const h = heights.data[i];
      const hx = heights.data[(y * size + ((x + 1) % size)) * 4] - h;
      const hy = heights.data[(((y + 1) % size) * size + x) * 4] - h;
      normals.data[i] = 128 + hx;
      normals.data[i + 1] = 128 + hy;
      normals.data[i + 2] = 235;
      normals.data[i + 3] = 255;
    }
  }
  normalCtx.putImageData(normals, 0, 0);
  return {
    normal: canvasTex(normalCanvas, 8, 16),
    rough: canvasTex(roughCanvas, 8, 16),
  };
}
