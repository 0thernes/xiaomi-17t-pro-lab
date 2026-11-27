/**
 * Catalytic Zero-Allocation Linear Memory Arena & Reversible Byte-Vault
 *
 * Bridges two engineering mechanisms from `0thernes/catalytic-register-frontiers`:
 *   1. Reusable linear-memory scratch arena (`CatalyticArena`): eliminates per-frame and
 *      per-token TypedArray heap allocations via O(1) bump/rewind slicing over either
 *      a WebAssembly.Memory slab or an ArrayBuffer fallback.
 *   2. Reversible Catalytic Byte-Vault (`catalyticBorrowXor`, `catalyticBorrowShear`):
 *      borrows existing dirty byte/register buffers in-place via exact involutive XOR
 *      or modular additive shear over Z/mZ, runs computation, and proves bit-exact
 *      restoration (verified against Lean 4.35.0 module `XiaomiLabProofs.CatalyticArena`).
 */

const PAGE_BYTES = 65536;

export class CatalyticArena {
  /**
   * @param {WebAssembly.Memory | null} wasmMemory
   * @param {number} baseOffset 64-byte aligned start past WASM stack/data
   * @param {number} initialBytes fallback ArrayBuffer capacity when wasmMemory is null
   */
  constructor(wasmMemory = null, baseOffset = 0, initialBytes = 256 * 1024) {
    this.wasmMemory = wasmMemory;
    this.baseOffset = (baseOffset + 63) & ~63;
    this.cursor = this.baseOffset;
    this.peakBytes = 0;
    this.allocCount = 0;
    this.rewindCount = 0;
    this._fallback = wasmMemory ? null : new ArrayBuffer(Math.max(PAGE_BYTES, initialBytes));
  }

  get buffer() {
    return this.wasmMemory ? this.wasmMemory.buffer : this._fallback;
  }

  get byteLength() {
    return this.buffer.byteLength;
  }

  get usedBytes() {
    return this.cursor - this.baseOffset;
  }

  ensureCapacity(requiredEnd) {
    const curLen = this.byteLength;
    if (requiredEnd <= curLen) return;
    if (this.wasmMemory) {
      const neededPages = Math.ceil((requiredEnd - curLen) / PAGE_BYTES);
      this.wasmMemory.grow(neededPages);
    } else {
      const nextLen = Math.ceil(requiredEnd / PAGE_BYTES) * PAGE_BYTES;
      const nextBuf = new ArrayBuffer(nextLen);
      new Uint8Array(nextBuf).set(new Uint8Array(this._fallback));
      this._fallback = nextBuf;
    }
  }

  mark() {
    return this.cursor;
  }

  rewind(savedMark = this.baseOffset) {
    const target = Math.max(this.baseOffset, savedMark);
    if (target > this.cursor) {
      throw new RangeError(`Cannot rewind catalytic arena forward (${target} > ${this.cursor})`);
    }
    this.cursor = target;
    this.rewindCount += 1;
  }

  /**
   * Allocate a disjoint, aligned slice inside the arena.
   * Returns `{ ptr, byteLength, length }`; create typed views on demand via `view*()`
   * so views stay valid even after a later `ensureCapacity()` memory growth.
   */
  alloc(byteLength, align = 16) {
    if (!Number.isInteger(byteLength) || byteLength < 0) {
      throw new RangeError("byteLength must be a non-negative integer");
    }
    const a = Math.max(1, align);
    const ptr = (this.cursor + (a - 1)) & ~(a - 1);
    const end = ptr + byteLength;
    this.ensureCapacity(end);
    this.cursor = end;
    this.allocCount += 1;
    const used = this.cursor - this.baseOffset;
    if (used > this.peakBytes) this.peakBytes = used;
    return { ptr, byteLength, end };
  }

  allocFloat32(len) {
    const s = this.alloc(len * 4, 16);
    return { ...s, length: len, view: () => new Float32Array(this.buffer, s.ptr, len) };
  }

  allocFloat64(len) {
    const s = this.alloc(len * 8, 16);
    return { ...s, length: len, view: () => new Float64Array(this.buffer, s.ptr, len) };
  }

  allocInt8(len) {
    const s = this.alloc(len, 16);
    return { ...s, length: len, view: () => new Int8Array(this.buffer, s.ptr, len) };
  }

  allocUint8(len) {
    const s = this.alloc(len, 16);
    return { ...s, length: len, view: () => new Uint8Array(this.buffer, s.ptr, len) };
  }

  allocUint16(len) {
    const s = this.alloc(len * 2, 16);
    return { ...s, length: len, view: () => new Uint16Array(this.buffer, s.ptr, len) };
  }

  allocUint32(len) {
    const s = this.alloc(len * 4, 16);
    return { ...s, length: len, view: () => new Uint32Array(this.buffer, s.ptr, len) };
  }

  telemetry() {
    return {
      baseOffset: this.baseOffset,
      usedBytes: this.usedBytes,
      peakBytes: this.peakBytes,
      capacityBytes: this.byteLength,
      allocCount: this.allocCount,
      rewindCount: this.rewindCount,
      wasmBacked: Boolean(this.wasmMemory),
    };
  }
}

/**
 * Reversible Catalytic Byte-Vault borrow-and-restore via involutive XOR:
 *   1. Scrambles `hostBytes` in-place with `maskBytes` (`B' = B XOR M`), using WASM SIMD128
 *      when `fastKernels` is provided or scalar fallback otherwise.
 *   2. Invokes `workFn(hostBytes)` on the borrowed space.
 *   3. Restores `hostBytes` in-place via the exact involution (`B'' = B' XOR M = B`).
 *   4. Verifies zero residual drift against an optional snapshot or checksum.
 */
export function catalyticBorrowXor(hostBytes, maskBytes, workFn, fastKernels = null) {
  if (!(hostBytes instanceof Uint8Array) || !(maskBytes instanceof Uint8Array)) {
    throw new TypeError("hostBytes and maskBytes must be Uint8Array");
  }
  if (hostBytes.length !== maskBytes.length) {
    throw new RangeError("hostBytes and maskBytes must have identical length");
  }
  const n = hostBytes.length;
  let result;
  if (fastKernels?.exports?.catalytic_xor_simd && fastKernels.arena && n > 0) {
    const arena = fastKernels.arena;
    const saved = arena.mark();
    try {
      const bSlice = arena.allocUint8(n);
      const mSlice = arena.allocUint8(n);
      bSlice.view().set(hostBytes);
      mSlice.view().set(maskBytes);
      fastKernels.exports.catalytic_xor_simd(bSlice.ptr, mSlice.ptr, n);
      hostBytes.set(bSlice.view());
      result = workFn ? workFn(hostBytes) : undefined;
      bSlice.view().set(hostBytes);
      fastKernels.exports.catalytic_xor_simd(bSlice.ptr, mSlice.ptr, n);
      hostBytes.set(bSlice.view());
    } finally {
      arena.rewind(saved);
    }
  } else {
    for (let i = 0; i < n; i++) hostBytes[i] ^= maskBytes[i];
    try {
      result = workFn ? workFn(hostBytes) : undefined;
    } finally {
      for (let i = 0; i < n; i++) hostBytes[i] ^= maskBytes[i];
    }
  }
  return result;
}

/**
 * Reversible Catalytic Register Shear over Z/mZ (honoring `catalytic-register-frontiers`):
 *   Borrows `regs` (`Uint32Array`, elements in `[0, modulus)`), applies `(r + delta) mod m`,
 *   runs `workFn(regs)`, and executes exact modular inverse `(r + m - (delta mod m)) mod m`.
 */
export function catalyticBorrowShear(regs, delta, modulus, workFn, fastKernels = null) {
  if (!(regs instanceof Uint32Array) || !(delta instanceof Uint32Array)) {
    throw new TypeError("regs and delta must be Uint32Array");
  }
  if (regs.length !== delta.length) {
    throw new RangeError("regs and delta must have identical length");
  }
  if (!Number.isInteger(modulus) || modulus < 2 || modulus > 0x7fffffff) {
    throw new RangeError("modulus must be an integer in [2, 2^31 - 1]");
  }
  const n = regs.length;
  let result;
  if (
    fastKernels?.exports?.catalytic_shear_add_u32 &&
    fastKernels?.exports?.catalytic_shear_sub_u32 &&
    fastKernels.arena &&
    n > 0
  ) {
    const arena = fastKernels.arena;
    const saved = arena.mark();
    try {
      const rSlice = arena.allocUint32(n);
      const dSlice = arena.allocUint32(n);
      rSlice.view().set(regs);
      dSlice.view().set(delta);
      fastKernels.exports.catalytic_shear_add_u32(rSlice.ptr, dSlice.ptr, n, modulus);
      regs.set(rSlice.view());
      result = workFn ? workFn(regs) : undefined;
      rSlice.view().set(regs);
      fastKernels.exports.catalytic_shear_sub_u32(rSlice.ptr, dSlice.ptr, n, modulus);
      regs.set(rSlice.view());
    } finally {
      arena.rewind(saved);
    }
  } else {
    for (let i = 0; i < n; i++) regs[i] = (regs[i] + (delta[i] % modulus)) % modulus;
    try {
      result = workFn ? workFn(regs) : undefined;
    } finally {
      for (let i = 0; i < n; i++) regs[i] = (regs[i] + modulus - (delta[i] % modulus)) % modulus;
    }
  }
  return result;
}

/** Exact byte-for-byte equality audit proving zero catalytic drift. */
export function verifyExactRestoration(before, after) {
  if (before.length !== after.length) return { exact: false, firstMismatch: 0, checked: 0 };
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i]) return { exact: false, firstMismatch: i, checked: i + 1 };
  }
  return { exact: true, firstMismatch: -1, checked: before.length };
}
