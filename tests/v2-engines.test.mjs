import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createDieThermalGrid, ironbowRgb, simulateSustainedThrottle } from "../src/sim/thermal-fdtd.js";
import { createWavePacketSim } from "../src/sim/tdse.js";
import { buildMask2d, fft2d, simulateLitho2d } from "../src/sim/litho-2d.js";
import {
  GATES,
  amplitudesSummary,
  applyCnot,
  applySingleQubit,
  blochVector,
  buildPresetState,
  createState,
  entanglementEntropy,
} from "../src/sim/quantum-lab.js";

describe("v2.0.0 unitary Crank-Nicolson TDSE wave-packet solver", () => {
  it("conserves probability norm to < 1e-8 across barrier scattering and double-barrier tunneling", () => {
    const sim = createWavePacketSim({
      n: 200,
      barrierWidthNm: 0.85,
      barrierHeightEv: 3.1,
      energyEv: 2.35,
      doubleBarrier: false,
    });
    const initial = sim.metrics();
    assert.ok(Math.abs(initial.norm - 1) < 1e-9, `initial norm ${initial.norm}`);
    sim.step(120);
    const after = sim.metrics();
    assert.ok(Math.abs(after.norm - 1) < 1e-8, `post-scattering norm drift ${Math.abs(after.norm - 1)}`);
    assert.ok(after.transmitted > 0.005, `expected nonzero tunneling, got ${after.transmitted}`);
    assert.ok(after.reflected > 0.1, `expected partial barrier reflection, got ${after.reflected}`);

    // Double-barrier resonant tunneling mode also remains strictly unitary
    sim.reconfigure({ doubleBarrier: true, barrierWidthNm: 0.7, barrierHeightEv: 3.0, energyEv: 2.4 });
    sim.step(100);
    const rtd = sim.metrics();
    assert.ok(Math.abs(rtd.norm - 1) < 1e-8, `RTD norm drift ${Math.abs(rtd.norm - 1)}`);
  });
});

describe("v2.0.0 2D FDTD silicon thermal PDE & 3D IceLoop VC", () => {
  it("keeps 3D IceLoop VC cooler than uncooled die and responds to localized hotspot injection", () => {
    const withVc = createDieThermalGrid({ ambientC: 25, vcEnabled: true, profileId: "gaming_nomad" });
    const noVc = createDieThermalGrid({ ambientC: 25, vcEnabled: false, profileId: "gaming_nomad" });
    for (let i = 0; i < 40; i++) {
      withVc.step(0.15, 4);
      noVc.step(0.15, 4);
    }
    const sVc = withVc.stats();
    const sNo = noVc.stats();
    assert.ok(sVc.peakC > 30 && sNo.peakC > sVc.peakC + 5, `VC=${sVc.peakC} vs noVC=${sNo.peakC}`);
    assert.ok(sVc.throttleScale >= sNo.throttleScale);

    const beforeHot = withVc.stats().peakC;
    withVc.injectHotspot(0.5, 0.5, 6.0, 3.0);
    withVc.step(0.12, 4);
    assert.ok(withVc.stats().peakC >= beforeHot, "hotspot injection should raise or sustain local temperature");

    const rgb = ironbowRgb(72, 24, 108);
    assert.equal(rgb.length, 3);
    for (const c of rgb) assert.ok(c >= 0 && c <= 255);

    const curve = simulateSustainedThrottle({ minutes: 20, ambientC: 25, profileId: "gaming_nomad" });
    assert.equal(curve.length, 41);
    assert.ok(Math.abs(curve[0].simSec) < 1e-9);
    assert.ok(Math.abs(curve.at(-1).simSec - 20 * 60) < 1e-6, `last sample at ${curve.at(-1).simSec}s, want 1200`);
    assert.ok(Math.abs(curve.at(-1).minute - 20) < 1e-9);
    assert.ok(curve.at(-1).vcPeakC < curve.at(-1).noVcPeakC);

    const claim = createDieThermalGrid().stats();
    assert.equal(claim.batteryWh, null);
    assert.equal(claim.batteryHrs, null);
    const sources = ["../src/sim/thermal-fdtd.js", "../src/labs/thermal.js", "../src/graphics/subjects.js"]
      .map((rel) => readFileSync(new URL(rel, import.meta.url), "utf8"))
      .join("\n");
    assert.equal(/3\.88|27\.16|90W/.test(sources), false);
  });
});

describe("v2.0.0 2D Fourier optics EUV lithography & OPC", () => {
  it("round-trips 2D FFT, images a clear field to 1, and improves fidelity at 0.55 High-NA", () => {
    const n = 16;
    const re = new Float64Array(n * n);
    const im = new Float64Array(n * n);
    for (let i = 0; i < re.length; i++) re[i] = Math.sin(i * 0.7);
    const orig = Float64Array.from(re);
    fft2d(re, im, n, false);
    fft2d(re, im, n, true);
    for (let i = 0; i < re.length; i++) {
      assert.ok(Math.abs(re[i] - orig[i]) < 1e-9);
      assert.ok(Math.abs(im[i]) < 1e-9);
    }

    const clear = simulateLitho2d({ pattern: "clear", na: 0.33, sigma: 0, defocusNm: 0, n: 32 });
    for (const v of clear.aerial) assert.ok(Math.abs(v - 1) < 1e-6);

    const lowNa = simulateLitho2d({ pattern: "sram6t", na: 0.33, sigma: 0.65, n: 64 });
    const highNa = simulateLitho2d({ pattern: "sram6t", na: 0.55, sigma: 0.65, n: 64 });
    assert.ok(highNa.fidelityIoU >= lowNa.fidelityIoU, `High-NA ${highNa.fidelityIoU} vs Low-NA ${lowNa.fidelityIoU}`);

    const mNoOpc = buildMask2d("elbow", { n: 64, opc: false });
    const mOpc = buildMask2d("elbow", { n: 64, opc: true });
    let diffs = 0;
    for (let i = 0; i < mNoOpc.length; i++) if (mNoOpc[i] !== mOpc[i]) diffs += 1;
    assert.ok(diffs > 20, "OPC serifs should modify corner pixels");
  });
});

describe("v2.0.0 interactive quantum circuit composer & entanglement entropy", () => {
  it("produces exact Bloch vectors, T-gate phase, Bell 1-bit entanglement, and GHZ amplitudes", () => {
    const plus = buildPresetState("plus");
    const bvPlus = blochVector(plus.state, 0);
    assert.ok(Math.abs(bvPlus.x - 1) < 1e-9 && Math.abs(bvPlus.z) < 1e-9);
    assert.ok(entanglementEntropy(plus.state, 0) < 1e-9);

    const bell = buildPresetState("bell");
    assert.ok(Math.abs(entanglementEntropy(bell.state, 0) - 1) < 1e-9);
    assert.ok(Math.abs(blochVector(bell.state, 0).purity - 0.5) < 1e-9);

    const st = createState(1);
    applySingleQubit(st, 0, GATES.H);
    applySingleQubit(st, 0, GATES.T);
    const amps = amplitudesSummary(st);
    assert.ok(Math.abs(amps[1].phase - Math.PI / 4) < 1e-9);

    const ghz = buildPresetState("ghz");
    const ghzAmps = amplitudesSummary(ghz.state);
    assert.ok(Math.abs(ghzAmps[0].prob - 0.5) < 1e-9 && Math.abs(ghzAmps[7].prob - 0.5) < 1e-9);
    // Double-check CNOT involution
    applyCnot(bell.state, 0, 1);
    assert.ok(entanglementEntropy(bell.state, 0) < 1e-9);
  });
});
