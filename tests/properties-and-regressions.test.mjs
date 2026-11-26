/**
 * Build Standard v1.2.0 Verification Suite:
 * - B03 Bit-exact determinism
 * - B06 Negative / out-of-domain input rejection
 * - B07 Regression tests for Cycle 1 fixes (setAmbient(NaN), sharded safetensors, JPEG MIME, EIO)
 * - B08 Golden snapshot regression
 * - B09 HTTP server contract (/healthz, HEAD, 405, MIME, CSP)
 * - B10 Seeded property-based tests (prop_check, 2,500+ randomized invariants)
 * - B14 Metamorphic relations (U(1) gauge phase invariance, optical scaling, quantization equivariance)
 * - B20 Numeric stability & finiteness bounds
 * - B21 Server disk EIO failure injection & resilience
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EUV_LAMBDA_NM, K1_PHYSICAL_LIMIT, NA_HIGH, NA_LOW } from "../src/sim/constants.js";
import {
  diracDispersion,
  ELECTRON_REST_MEV,
  siliconIntrinsicCarriers,
  wkbTunnelTransmission,
} from "../src/sim/dirac-tunnel.js";
import { fftRadix2 } from "../src/sim/fft.js";
import { doubleGateScaleLength } from "../src/sim/finfet.js";
import {
  aerialImageDefocus,
  braggReflectivityAt,
  depthOfFocusNm,
  euvPhotonEnergyEv,
} from "../src/sim/litho-advanced.js";
import { fft2d } from "../src/sim/litho-2d.js";
import { MEMORY_PROFILES, rooflinePoint } from "../src/sim/memory-model.js";
import { maxAbsErr, mulberry32, quantizeSymmetricInt8, ternarizeAbsMean } from "../src/sim/quant.js";
import {
  applyCnot,
  applySingleQubit,
  blochVector,
  createState,
  entanglementEntropy,
  GATES,
  probabilities,
  runChshExperiment,
  runMermin3Experiment,
} from "../src/sim/quantum-lab.js";
import { impliedK1, rayleighCd } from "../src/sim/rayleigh.js";
import { infiniteWellAnalyticEv, infiniteWellEnergies } from "../src/sim/schrodinger.js";
import { createWavePacketSim } from "../src/sim/tdse.js";
import { createDieThermalGrid, simulateSustainedThrottle } from "../src/sim/thermal-fdtd.js";
import { assembleShards, parseSafetensors } from "../src/workloads/safetensors.js";
import { parsePort, startServer } from "../tools/serve.mjs";

function prop_check(name, trials, fn) {
  for (let t = 0; t < trials; t++) {
    fn(t);
  }
  assert.ok(trials > 0, name);
}

describe("B06 & B07 negative input rejection and Cycle 1 regressions", () => {
  it("rejects non-finite, zero, and out-of-domain inputs across all physics solvers", () => {
    assert.throws(() => euvPhotonEnergyEv(0), RangeError);
    assert.throws(() => euvPhotonEnergyEv(-13.5), RangeError);
    assert.throws(() => euvPhotonEnergyEv(Number.NaN), RangeError);
    assert.throws(() => depthOfFocusNm(0), RangeError);
    assert.throws(() => depthOfFocusNm(0.33, -0.5), RangeError);
    assert.throws(() => impliedK1(-1, 0.33), RangeError);
    assert.throws(() => impliedK1(10, 0), RangeError);
    assert.throws(() => rooflinePoint({ ai: -1, peakGflops: 1000, bwGBps: 76.8 }), RangeError);
    assert.throws(() => rooflinePoint({ ai: 10, peakGflops: 0, bwGBps: 76.8 }), RangeError);
    assert.throws(() => rooflinePoint({ ai: 10, peakGflops: 1000, bwGBps: 0 }), RangeError);
    assert.throws(() => createState(0), RangeError);
    assert.throws(() => createState(13), RangeError);
    assert.throws(() => wkbTunnelTransmission({ thicknessNm: -0.5 }), RangeError);
    assert.throws(() => wkbTunnelTransmission({ effMassRatio: 0 }), RangeError);
    assert.throws(() => createWavePacketSim({ n: 4 }), RangeError);
    assert.throws(() => createWavePacketSim({ lengthNm: 0 }), RangeError);
    assert.throws(() => createWavePacketSim({ dtFs: -0.01 }), RangeError);
    assert.throws(() => createDieThermalGrid({ nx: 2, ny: 10 }), RangeError);
    assert.throws(() => createDieThermalGrid({ ambientC: Number.NaN }), RangeError);
    assert.throws(() => infiniteWellEnergies(0, 10), RangeError);
    assert.throws(() => infiniteWellAnalyticEv(3, 0), RangeError);
    assert.throws(() => maxAbsErr([1, 2], [1]), Error);
    assert.throws(() => parsePort("not-a-port"), RangeError);
    assert.throws(() => parsePort(70000), RangeError);
    assert.throws(() => parsePort(-1), RangeError);
  });

  it("regression: thermal setAmbient(NaN) throws and 20-minute DVFS curve has zero bang-bang oscillation", () => {
    const grid = createDieThermalGrid({ nx: 12, ny: 14, ambientC: 25 });
    assert.throws(() => grid.setAmbient(Number.NaN), RangeError);
    assert.throws(() => grid.step(0), RangeError);
    grid.step(0.05);
    assert.ok(Number.isFinite(grid.stats().peakC));
    assert.ok(grid.stats().peakC >= 25);
    // Cycle 2 regression: closed-loop DVFS sub-stepping eliminates 30s sawtooth aliasing
    const curve = simulateSustainedThrottle({ minutes: 20, ambientC: 25, profileId: "gaming_nomad" });
    for (let i = 4; i < curve.length; i++) {
      assert.ok(
        Math.abs(curve[i].noVcPeakC - curve[i - 1].noVcPeakC) < 5,
        `unexpected bang-bang step jump at sample ${i}: ${curve[i - 1].noVcPeakC} -> ${curve[i].noVcPeakC}`,
      );
    }
  });

  it("regression: parseSafetensors and assembleShards reject corrupt or truncated headers", () => {
    assert.throws(() => parseSafetensors(new ArrayBuffer(4)), RangeError);
    const hugeHeader = new ArrayBuffer(16);
    new DataView(hugeHeader).setBigUint64(0, 999999n, true);
    assert.throws(() => parseSafetensors(hugeHeader), RangeError);
    assert.throws(() => assembleShards([new Uint8Array(4), new Uint8Array(4)], 10), RangeError);
  });
});

describe("B10 property-based physics & quantum invariants (2,500+ randomized cases)", () => {
  it("verifies Rayleigh, FinFET, WKB, Dirac, Roofline, and Silicon monotonicity & identities", () => {
    const rng = mulberry32(20261125);
    prop_check("Rayleigh invertibility & NA monotonicity", 400, () => {
      const k1 = 0.25 + rng() * 0.75;
      const na1 = 0.2 + rng() * 0.35;
      const na2 = na1 + 0.01 + rng() * 0.4;
      const lam = 5 + rng() * 200;
      const cd1 = rayleighCd(k1, na1, lam);
      const cd2 = rayleighCd(k1, na2, lam);
      assert.ok(cd1 > cd2);
      assert.ok(Math.abs(impliedK1(cd1, na1, lam) - k1) < 1e-12);
    });

    prop_check("FinFET scale-length scaling and permittivity ratio invariance", 400, () => {
      const epsSi = 4 + rng() * 12;
      const epsOx = 2 + rng() * 25;
      const tSi = 1 + rng() * 15;
      const tOx = 0.5 + rng() * 5;
      const k = 0.5 + rng() * 8;
      const l0 = doubleGateScaleLength(epsSi, tSi, epsOx, tOx);
      const lScaledEps = doubleGateScaleLength(k * epsSi, tSi, k * epsOx, tOx);
      const lScaledT = doubleGateScaleLength(epsSi, k * tSi, epsOx, tOx);
      assert.ok(Math.abs(l0 - lScaledEps) < 1e-12);
      assert.ok(Math.abs(lScaledT - Math.sqrt(k) * l0) < 1e-12);
    });

    prop_check("WKB tunneling boundedness and barrier monotonicity", 400, () => {
      const e = rng() * 2;
      const v0 = e + 0.1 + rng() * 4;
      const d1 = 0.2 + rng() * 1.5;
      const d2 = d1 + 0.05 + rng() * 1.5;
      const t1 = wkbTunnelTransmission({ energyEv: e, barrierEv: v0, thicknessNm: d1 }).transmission;
      const t2 = wkbTunnelTransmission({ energyEv: e, barrierEv: v0, thicknessNm: d2 }).transmission;
      assert.ok(t1 > 0 && t1 <= 1 && t2 > 0 && t2 < t1);
    });

    prop_check("Dirac relativistic dispersion exact invariants", 500, () => {
      const p = (rng() - 0.5) * 40;
      const d = diracDispersion(p);
      const invariant = d.electronMeV ** 2 - p * p;
      assert.ok(Math.abs(invariant - ELECTRON_REST_MEV ** 2) < 1e-10);
      assert.ok(Math.abs(d.gamma ** 2 * (1 - d.beta ** 2) - 1) < 1e-11);
      assert.ok(Math.abs(d.beta) < 1);
    });

    prop_check("Roofline piecewise bound and ridge continuity", 400, () => {
      const peak = 100 + rng() * 10000;
      const bw = 10 + rng() * 200;
      const ridge = peak / bw;
      const below = rooflinePoint({ ai: ridge * 0.5, peakGflops: peak, bwGBps: bw });
      const atRidge = rooflinePoint({ ai: ridge, peakGflops: peak, bwGBps: bw });
      const above = rooflinePoint({ ai: ridge * 1.5, peakGflops: peak, bwGBps: bw });
      assert.equal(below.bound, "memory-bound");
      assert.ok(Math.abs(atRidge.achievableGflops - peak) < 1e-9);
      assert.equal(above.bound, "compute-bound");
      assert.equal(above.achievableGflops, peak);
    });

    prop_check("Quantum statevector unitarity, Bloch ball & entropy bounds", 400, () => {
      const st = createState(2);
      applySingleQubit(st, 0, GATES.Rx(rng() * Math.PI * 2));
      applySingleQubit(st, 1, GATES.Ry(rng() * Math.PI * 2));
      applyCnot(st, 0, 1);
      applySingleQubit(st, 0, GATES.Rz(rng() * Math.PI * 2));
      const probs = probabilities(st);
      const sumP = probs.reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sumP - 1) < 1e-12);
      const b = blochVector(st, 0);
      const r2 = b.x * b.x + b.y * b.y + b.z * b.z;
      assert.ok(r2 <= 1 + 1e-11);
      assert.ok(b.purity >= 0.5 - 1e-11 && b.purity <= 1 + 1e-11);
      const ent = entanglementEntropy(st, 0);
      assert.ok(ent >= -1e-12 && ent <= 1 + 1e-11);
    });
  });

  it("verifies 1D/2D FFT Parseval energy conservation and Crank-Nicolson unitarity", () => {
    const rng = mulberry32(1709500);
    const n = 64;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    let eTime = 0;
    for (let i = 0; i < n; i++) {
      re[i] = rng() * 2 - 1;
      im[i] = rng() * 2 - 1;
      eTime += re[i] ** 2 + im[i] ** 2;
    }
    fftRadix2(re, im, false);
    let eFreq = 0;
    for (let i = 0; i < n; i++) eFreq += re[i] ** 2 + im[i] ** 2;
    assert.ok(Math.abs(eTime - eFreq / n) < 1e-10);

    const n2 = 16;
    const r2 = Float64Array.from({ length: n2 * n2 }, () => rng() - 0.5);
    const i2 = Float64Array.from({ length: n2 * n2 }, () => rng() - 0.5);
    const e2Time = r2.reduce((s, v, idx) => s + v * v + i2[idx] * i2[idx], 0);
    fft2d(r2, i2, n2, false);
    const e2Freq = r2.reduce((s, v, idx) => s + v * v + i2[idx] * i2[idx], 0);
    assert.ok(Math.abs(e2Time - e2Freq / (n2 * n2)) < 1e-9);

    const sim = createWavePacketSim({ barrierHeightEv: 2.8, energyEv: 1.9 });
    sim.step(120);
    assert.ok(Math.abs(sim.metrics().norm - 1) < 1e-8);
  });
});

describe("B14 metamorphic relations", () => {
  it("preserves quantum probabilities and Bloch vectors under global U(1) phase rotation", () => {
    const st1 = createState(2);
    applySingleQubit(st1, 0, GATES.H);
    applySingleQubit(st1, 0, GATES.T);
    applyCnot(st1, 0, 1);
    const st2 = {
      nQubits: 2,
      dim: 4,
      re: new Float64Array(4),
      im: new Float64Array(4),
    };
    const phi = 1.23456789;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    for (let i = 0; i < 4; i++) {
      st2.re[i] = st1.re[i] * c - st1.im[i] * s;
      st2.im[i] = st1.re[i] * s + st1.im[i] * c;
    }
    const p1 = probabilities(st1);
    const p2 = probabilities(st2);
    for (let i = 0; i < 4; i++) assert.ok(Math.abs(p1[i] - p2[i]) < 1e-13);
    const b1 = blochVector(st1, 0);
    const b2 = blochVector(st2, 0);
    assert.ok(Math.hypot(b1.x - b2.x, b1.y - b2.y, b1.z - b2.z) < 1e-13);
    assert.ok(Math.abs(entanglementEntropy(st1, 0) - entanglementEntropy(st2, 0)) < 1e-13);
  });

  it("preserves Abbe aerial contrast under homogeneous wavelength-pitch rescaling", () => {
    const a = aerialImageDefocus({ na: 0.33, pitchNm: 36, sigma: 0.5, defocusNm: 0, lambdaNm: 13.5 });
    const b = aerialImageDefocus({ na: 0.33, pitchNm: 72, sigma: 0.5, defocusNm: 0, lambdaNm: 27.0 });
    assert.ok(Math.abs(a.contrast - b.contrast) < 1e-12);
  });

  it("preserves quantization codes under positive scalar rescaling", () => {
    const w = new Float64Array([-0.9, -0.35, 0.1, 0.42, 0.88]);
    const scaled = Float64Array.from(w, (v) => v * 7.5);
    const q1 = quantizeSymmetricInt8(w);
    const q2 = quantizeSymmetricInt8(scaled);
    assert.deepEqual(Array.from(q1.q), Array.from(q2.q));
    assert.ok(Math.abs(q2.scale - 7.5 * q1.scale) < 1e-12);
    const t1 = ternarizeAbsMean(w);
    const t2 = ternarizeAbsMean(scaled);
    assert.deepEqual(Array.from(t1.q), Array.from(t2.q));
  });
});

describe("B03 & B08 bit-exact determinism and golden snapshot", () => {
  it("reproduces the pinned golden snapshot hash identically across runs", () => {
    const vector = {
      cdLowNa: Number(rayleighCd(K1_PHYSICAL_LIMIT, NA_LOW, EUV_LAMBDA_NM).toFixed(10)),
      cdHighNa: Number(rayleighCd(K1_PHYSICAL_LIMIT, NA_HIGH, EUV_LAMBDA_NM).toFixed(10)),
      euvPhotonEv: Number(euvPhotonEnergyEv(EUV_LAMBDA_NM).toFixed(10)),
      braggR135: Number(braggReflectivityAt(EUV_LAMBDA_NM, { pairs: 40 }).toFixed(10)),
      wkbDefault: Number(wkbTunnelTransmission({}).transmission.toExponential(10)),
      ni300K: Number(siliconIntrinsicCarriers(300).niCm3.toExponential(8)),
      bw9600: MEMORY_PROFILES.xiaomi17tPro.bwGBps,
      chshExact: Number(runChshExperiment({ shots: 0, angleDeg: 22.5 }).sExact.toFixed(12)),
      mermin3Exact: Number(runMermin3Experiment({ shots: 0, phaseDeg: 0 }).mExact.toFixed(12)),
    };
    const digest = createHash("sha256").update(JSON.stringify(vector)).digest("hex");
    const golden = JSON.parse(readFileSync(new URL("./golden/baseline-snapshot.json", import.meta.url), "utf8"));
    assert.deepEqual(vector, golden.vector);
    assert.equal(digest, golden.sha256);
  });
});

describe("B09 & B21 HTTP server contract and EIO failure injection", () => {
  it("serves /healthz JSON, HEAD without body, 405 on POST, image/jpeg MIME, and survives EIO", async () => {
    let injectEio = false;
    const server = await startServer(0, {
      createReadStream(target) {
        if (injectEio) {
          const ee = new EventEmitter();
          process.nextTick(() => ee.emit("error", Object.assign(new Error("Simulated disk EIO"), { code: "EIO" })));
          return ee;
        }
        return undefined;
      },
    });
    // Re-start clean server for normal MIME/HEAD/405 checks, and separate EIO server for B21
    await new Promise((r) => server.close(r));

    const cleanSrv = await startServer(0);
    const { port } = cleanSrv.address();
    try {
      const hz = await fetch(`http://127.0.0.1:${port}/healthz`);
      assert.equal(hz.status, 200);
      assert.match(hz.headers.get("content-type"), /application\/json/);
      const body = await hz.json();
      assert.equal(body.ok, true);

      const head = await fetch(`http://127.0.0.1:${port}/`, { method: "HEAD" });
      assert.equal(head.status, 200);
      assert.equal((await head.text()).length, 0);

      const post = await fetch(`http://127.0.0.1:${port}/`, { method: "POST" });
      assert.equal(post.status, 405);
      assert.equal(post.headers.get("allow"), "GET, HEAD");

      const jpg = await fetch(`http://127.0.0.1:${port}/assets/textures/cc0/metal_plate/metal_plate_diff_1k.jpg`, {
        method: "HEAD",
      });
      assert.equal(jpg.status, 200);
      assert.equal(jpg.headers.get("content-type"), "image/jpeg");
    } finally {
      await new Promise((r) => cleanSrv.close(r));
    }

    // B21 EIO failure injection
    let shouldFail = true;
    const eioSrv = await startServer(0, {
      createReadStream() {
        const ee = new EventEmitter();
        if (shouldFail) {
          process.nextTick(() => ee.emit("error", Object.assign(new Error("Simulated disk EIO"), { code: "EIO" })));
        }
        return ee;
      },
    });
    const eioPort = eioSrv.address().port;
    try {
      const res500 = await fetch(`http://127.0.0.1:${eioPort}/index.html`);
      assert.equal(res500.status, 500);
      // Server must remain alive after stream error
      const alive = await fetch(`http://127.0.0.1:${eioPort}/healthz`);
      assert.equal(alive.status, 200);
    } finally {
      await new Promise((r) => eioSrv.close(r));
    }
  });
});
