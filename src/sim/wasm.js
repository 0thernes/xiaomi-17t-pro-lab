/**
 * Load the vendored WebAssembly kernels (both legacy WAT benchmark module `kernels.wasm`
 * and compiled `#![no_std]` Rust SIMD128 numerical/catalytic module `fast-kernels.wasm`).
 *
 * Works in Node.js (local filesystem) and browsers (same-origin fetch, strict CSP).
 * Honest boundary: these kernels run in the browser/Node WASM engine (JIT to host CPU SIMD),
 * NEVER on the MediaTek NPU 990 or Arm SME2 matrix unit.
 */
import { CatalyticArena } from "./catalytic-arena.js";

let cachedLegacy = null;
let cachedFast = null;
let fastLoadPromise = null;
let fastLoadFailed = false;

export async function loadKernels() {
  if (cachedLegacy) return cachedLegacy;
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
  cachedLegacy = instance.exports;
  return cachedLegacy;
}

function wrapFastInstance(instance) {
  const exports = instance.exports;
  const base = typeof exports.alloc_base === "function" ? exports.alloc_base() : 65536;
  const arena = new CatalyticArena(exports.memory, base);
  return {
    exports,
    memory: exports.memory,
    arena,
    backend: "rust-wasm-simd128",
    simdEnabled: true,
  };
}

/**
 * Async loader for `fast-kernels.wasm` (works in browsers & Node).
 * Returns `null` gracefully if WASM SIMD128 is unsupported so callers fall back to JS.
 */
export async function loadFastKernels() {
  if (cachedFast) return cachedFast;
  if (fastLoadFailed) return null;
  if (!fastLoadPromise) {
    fastLoadPromise = (async () => {
      try {
        const url = new URL("./fast-kernels.wasm", import.meta.url);
        let bytes;
        if (typeof process !== "undefined" && process.versions?.node) {
          const { readFile } = await import("node:fs/promises");
          bytes = await readFile(url);
        } else {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Fast WASM fetch failed: ${response.status}`);
          bytes = await response.arrayBuffer();
        }
        const { instance } = await WebAssembly.instantiate(bytes);
        cachedFast = wrapFastInstance(instance);
        return cachedFast;
      } catch {
        fastLoadFailed = true;
        return null;
      }
    })();
  }
  return fastLoadPromise;
}

/**
 * Synchronous accessor for `fast-kernels.wasm`.
 * - In browsers: returns the instance preloaded by `src/main.js` (or `null` before ready).
 * - In Node.js: auto-loads synchronously on first call so CLI/test/bench callers get
 *   immediate Rust WASM SIMD128 acceleration without changing synchronous solver APIs.
 */
export function getFastKernelsSync() {
  if (cachedFast) return cachedFast;
  if (fastLoadFailed) return null;
  if (typeof process !== "undefined" && process.versions?.node && typeof process.getBuiltinModule === "function") {
    try {
      const fs = process.getBuiltinModule("node:fs");
      const url = new URL("./fast-kernels.wasm", import.meta.url);
      const bytes = fs.readFileSync(url);
      const mod = new WebAssembly.Module(bytes);
      const instance = new WebAssembly.Instance(mod);
      cachedFast = wrapFastInstance(instance);
      return cachedFast;
    } catch {
      fastLoadFailed = true;
      return null;
    }
  }
  return null;
}

export function resetKernelCache() {
  cachedLegacy = null;
  cachedFast = null;
  fastLoadPromise = null;
  fastLoadFailed = false;
}
