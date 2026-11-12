/**
 * Load the vendored WASM kernels. Works in Node (read file) and in the browser (fetch).
 * The kernels are software. They do not run on the MediaTek NPU.
 */

let cached = null;

export async function loadKernels() {
  if (cached) return cached;
  const url = new URL("./kernels.wasm", import.meta.url);
  let bytes;
  if (typeof process !== "undefined" && process.versions?.node) {
    const { readFile } = await import("node:fs/promises");
    bytes = await readFile(url);
  } else {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`WASM fetch failed: ${response.status}`);
    bytes = await response.arrayBuffer();
  }
  const { instance } = await WebAssembly.instantiate(bytes);
  cached = instance.exports;
  return cached;
}

export function resetKernelCache() {
  cached = null;
}
