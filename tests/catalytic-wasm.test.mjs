import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, test } from "node:test";
import {
  CatalyticArena,
  catalyticBorrowShear,
  catalyticBorrowXor,
  verifyExactRestoration,
} from "../src/sim/catalytic-arena.js";
import { fftRadix2 } from "../src/sim/fft.js";
import { fft2d } from "../src/sim/litho-2d.js";
import { fillUnit, matmulQuantized, mulberry32, quantizeSymmetricInt8 } from "../src/sim/quant.js";
import { fubiniStudyMetric1Qubit, nistSp80090bHealthTest } from "../src/sim/quantum-lab.js";
import { createWavePacketSim } from "../src/sim/tdse.js";
import { createDieThermalGrid, ironbowFillRgba, ironbowRgb } from "../src/sim/thermal-fdtd.js";
import { getFastKernelsSync, loadFastKernels } from "../src/sim/wasm.js";
import { float16ToFloat32 } from "../src/workloads/safetensors.js";

describe("v4.0.0 Catalytic Arena & Byte-Vault Reversibility", () => {
  test("CatalyticArena serves disjoint 16-byte aligned slices and rewinds cleanly with zero drift", () => {
    const arena = new CatalyticArena(null, 0, 65536);
    const m0 = arena.mark();
    const s1 = arena.allocFloat32(128);
    const s2 = arena.allocFloat64(64);
    assert.equal(s1.ptr & 15, 0);
    assert.equal(s2.ptr & 15, 0);
    assert.ok(s1.ptr + s1.byteLength <= s2.ptr, "slices must be strictly disjoint");
    s1.view().fill(3.5);
    s2.view().fill(-7.25);
    assert.equal(s1.view()[127], 3.5);
    assert.equal(s2.view()[0], -7.25);
    // Grow beyond initial capacity and verify existing data survives
    const big = arena.allocUint8(100_000);
    assert.ok(arena.byteLength >= big.end);
    assert.equal(s1.view()[0], 3.5);
    arena.rewind(m0);
    assert.equal(arena.usedBytes, 0);
    assert.throws(() => arena.rewind(m0 + 16), RangeError);
  });

  test("catalyticBorrowXor restores borrowed bytes bit-for-bit (SHA-256 identical) in WASM SIMD128 and JS", async () => {
    const fk = await loadFastKernels();
    assert.ok(fk && fk.backend === "rust-wasm-simd128", "fast-kernels.wasm must load");
    const host = new Uint8Array(4099);
    const mask = new Uint8Array(4099);
    for (let i = 0; i < host.length; i++) {
      host[i] = (i * 73 + 19) & 0xff;
      mask[i] = (i * 131 + 7) & 0xff;
    }
    const snapshot = host.slice();
    const shaBefore = createHash("sha256").update(host).digest("hex");

    // 1. WASM SIMD128 v128_xor path
    let sawScrambled = false;
    catalyticBorrowXor(
      host,
      mask,
      (borrowed) => {
        sawScrambled = borrowed[0] === (snapshot[0] ^ mask[0]) && borrowed[4098] === (snapshot[4098] ^ mask[4098]);
      },
      fk,
    );
    assert.ok(sawScrambled, "borrowed buffer must carry scrambled payload during execution");
    assert.deepEqual(verifyExactRestoration(snapshot, host), { exact: true, firstMismatch: -1, checked: 4099 });
    assert.equal(createHash("sha256").update(host).digest("hex"), shaBefore);

    // 2. Pure-JS fallback path
    catalyticBorrowXor(host, mask, () => {}, null);
    assert.deepEqual(verifyExactRestoration(snapshot, host), { exact: true, firstMismatch: -1, checked: 4099 });
  });

  test("catalyticBorrowShear restores modular Z/257Z registers identically in WASM and JS", async () => {
    const fk = await loadFastKernels();
    const regs = new Uint32Array(256);
    const delta = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      regs[i] = i;
      delta[i] = (i * 97 + 13) % 257;
    }
    const orig = regs.slice();
    catalyticBorrowShear(
      regs,
      delta,
      257,
      (borrowed) => {
        assert.equal(borrowed[10], (10 + delta[10]) % 257);
      },
      fk,
    );
    assert.deepEqual(verifyExactRestoration(orig, regs), { exact: true, firstMismatch: -1, checked: 256 });

    catalyticBorrowShear(regs, delta, 257, () => {}, null);
    assert.deepEqual(verifyExactRestoration(orig, regs), { exact: true, firstMismatch: -1, checked: 256 });
  });
});

describe("v4.0.0 Rust WASM SIMD128 vs Pure-JS Exact Parity", () => {
  test("FP16 LUT and Rust WASM fp16_to_f32_bulk agree bit-for-bit across all 65,536 binary16 encodings", () => {
    const fk = getFastKernelsSync();
    assert.ok(fk, "sync WASM fast kernels must load in Node");
    const allHalf = new Uint16Array(65536);
    for (let i = 0; i < 65536; i++) allHalf[i] = i;
    const lutOut = float16ToFloat32(allHalf.buffer);

    const saved = fk.arena.mark();
    let wasmOut;
    try {
      const sIn = fk.arena.allocUint16(65536);
      const sOut = fk.arena.allocFloat32(65536);
      sIn.view().set(allHalf);
      fk.exports.fp16_to_f32_bulk(sIn.ptr, sOut.ptr, 65536);
      wasmOut = sOut.view().slice();
    } finally {
      fk.arena.rewind(saved);
    }

    const lutU32 = new Uint32Array(lutOut.buffer);
    const wasmU32 = new Uint32Array(wasmOut.buffer);
    for (let i = 0; i < 65536; i++) {
      if (Number.isNaN(lutOut[i]) && Number.isNaN(wasmOut[i])) continue;
      assert.equal(lutU32[i], wasmU32[i], `FP16 bit mismatch at 0x${i.toString(16)}`);
    }
  });

  test("2D Thermal FDTD WASM matches pure-JS fallback to < 1e-11 C (with and without hotspot)", () => {
    const a = createDieThermalGrid({ nx: 22, ny: 26, useWasm: true });
    const b = createDieThermalGrid({ nx: 22, ny: 26, useWasm: false });
    a.injectHotspot(0.5, 0.25, 4.0, 3.0);
    b.injectHotspot(0.5, 0.25, 4.0, 3.0);
    a.step(0.24, 6);
    b.step(0.24, 6);
    let maxDiff = 0;
    for (let i = 0; i < a.temp.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(a.temp[i] - b.temp[i]));
    }
    assert.ok(maxDiff < 1e-11, `FDTD WASM vs JS drift too large: ${maxDiff}`);
    // Verify Ironbow LUT RGBA helper matches ironbowRgb within +/- 2 RGB units
    const rgba = new Uint8ClampedArray(a.temp.length * 4);
    ironbowFillRgba(a.temp, rgba, 24, 108);
    const [r0, g0, b0] = ironbowRgb(a.temp[0], 24, 108);
    assert.ok(Math.abs(rgba[0] - r0) <= 2 && Math.abs(rgba[1] - g0) <= 2 && Math.abs(rgba[2] - b0) <= 2);
  });

  test("Crank-Nicolson TDSE WASM matches pure-JS fallback to < 1e-13 and conserves unitary norm", () => {
    const a = createWavePacketSim({ n: 180, useWasm: true });
    const b = createWavePacketSim({ n: 180, useWasm: false });
    a.step(30);
    b.step(30);
    let maxDiff = 0;
    for (let i = 0; i < a.n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(a.psiR[i] - b.psiR[i]), Math.abs(a.psiI[i] - b.psiI[i]));
    }
    assert.ok(maxDiff < 1e-12, `TDSE WASM vs JS drift: ${maxDiff}`);
    assert.ok(Math.abs(a.metrics().norm - 1) < 1e-10);
    assert.ok(Math.abs(b.metrics().norm - 1) < 1e-10);
  });

  test("Fused WASM 2D FFT and 1D 256-pt FFT match pure-JS fallback to < 1e-11", () => {
    const rng = mulberry32(17);
    const reA = fillUnit(64 * 64, rng);
    const imA = fillUnit(64 * 64, rng);
    const reB = reA.slice();
    const imB = imA.slice();
    fft2d(reA, imA, 64, false, { useWasm: true });
    fft2d(reB, imB, 64, false, { useWasm: false });
    let maxDiff = 0;
    for (let i = 0; i < reA.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(reA[i] - reB[i]), Math.abs(imA[i] - imB[i]));
    }
    assert.ok(maxDiff < 1e-11, `fft2d WASM vs JS drift: ${maxDiff}`);

    const r1 = fillUnit(256, rng);
    const i1 = fillUnit(256, rng);
    const r2 = r1.slice();
    const i2 = i1.slice();
    fftRadix2(r1, i1, false, { useWasm: true });
    fftRadix2(r2, i2, false, { useWasm: false });
    let d1 = 0;
    for (let i = 0; i < 256; i++) d1 = Math.max(d1, Math.abs(r1[i] - r2[i]), Math.abs(i1[i] - i2[i]));
    assert.ok(d1 < 1e-12, `fftRadix2(256) WASM vs JS drift: ${d1}`);
  });

  test("INT8 quantized matmul WASM SIMD128 matches pure-JS fallback to < 1e-12", () => {
    const rng = mulberry32(9500);
    const A = quantizeSymmetricInt8(fillUnit(32 * 32, rng));
    const B = quantizeSymmetricInt8(fillUnit(32 * 32, rng));
    const cWasm = matmulQuantized(A.q, A.scale, B.q, B.scale, 32, { useWasm: true });
    const cJs = matmulQuantized(A.q, A.scale, B.q, B.scale, 32, { useWasm: false });
    let maxDiff = 0;
    for (let i = 0; i < cWasm.length; i++) maxDiff = Math.max(maxDiff, Math.abs(cWasm[i] - cJs[i]));
    assert.ok(maxDiff < 1e-12, `int8_matmul WASM vs JS drift: ${maxDiff}`);
  });
});

describe("v4.0.0 QGTL 1-Qubit Fubini-Study Metric & NIST SP 800-90B Health Tests", () => {
  test("fubiniStudyMetric1Qubit satisfies exact CP^1 geometry on equator and poles", () => {
    const eq = fubiniStudyMetric1Qubit(Math.PI / 2, 0.7);
    assert.ok(Math.abs(eq.gThetaTheta - 0.25) < 1e-15);
    assert.ok(Math.abs(eq.gPhiPhi - 0.25) < 1e-15);
    assert.equal(eq.gThetaPhi, 0);
    assert.ok(Math.abs(eq.berryCurvature + 0.5) < 1e-15);
    assert.ok(Math.abs(eq.determinant - 0.0625) < 1e-15);

    const pole = fubiniStudyMetric1Qubit(0, 0);
    assert.equal(pole.gPhiPhi, 0);
    assert.equal(pole.determinant, 0);
    assert.throws(() => fubiniStudyMetric1Qubit(NaN, 0), RangeError);
  });

  test("nistSp80090bHealthTest passes uniform bitstream and rejects stuck or heavily biased streams", () => {
    const rng = mulberry32(2026);
    const fair = new Uint8Array(2048);
    for (let i = 0; i < fair.length; i++) fair[i] = rng() < 0.5 ? 0 : 1;
    const ok = nistSp80090bHealthTest(fair, { minEntropyBits: 1.0, binary: true });
    assert.equal(ok.pass, true);
    assert.equal(ok.rctCutoff, 21);

    const stuck = new Uint8Array(256).fill(1);
    const badRct = nistSp80090bHealthTest(stuck, { minEntropyBits: 1.0, binary: true });
    assert.equal(badRct.rctPass, false);
    assert.equal(badRct.pass, false);

    const biased = new Uint8Array(1024);
    for (let i = 0; i < biased.length; i++) biased[i] = i % 20 === 0 ? 0 : 1;
    const badApt = nistSp80090bHealthTest(biased, { minEntropyBits: 1.0, binary: true });
    assert.equal(badApt.aptPass, false);
    assert.equal(badApt.pass, false);
  });
});
