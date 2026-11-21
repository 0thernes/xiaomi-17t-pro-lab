import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aerialImageDefocus,
  braggSpectrum,
  depthOfFocusNm,
  euvPhotonEnergyEv,
  simulateStochasticResist,
} from "../src/sim/litho-advanced.js";
import {
  ELECTRON_REST_MEV,
  PAIR_THRESHOLD_MEV,
  diracDispersion,
  siliconIntrinsicCarriers,
  wellStates,
  wkbTunnelTransmission,
} from "../src/sim/dirac-tunnel.js";
import { llmDecodeCeiling, rooflinePoint } from "../src/sim/memory-model.js";
import {
  GATES,
  applyCnot,
  applySingleQubit,
  blochVector,
  createState,
  merminPeresSummary,
  runChshExperiment,
  runMermin3Experiment,
} from "../src/sim/quantum-lab.js";

describe("v1.0.0 advanced EUV lithography physics", () => {
  it("computes 13.5 nm photon energy, Mo/Si Bragg reflectivity, DOF, defocus, and Poisson shot noise", () => {
    const ev = euvPhotonEnergyEv(13.5);
    assert.ok(Math.abs(ev - 91.840147) < 1e-3);
    const bragg = braggSpectrum({ pairs: 40, dNm: 6.92, gamma: 0.4 });
    assert.ok(bragg.peakR > 0.6 && bragg.peakR < 0.8, `unexpected peakR ${bragg.peakR}`);
    assert.ok(bragg.elevenMirrorTransmission > 0.005 && bragg.elevenMirrorTransmission < 0.06);
    assert.ok(depthOfFocusNm(0.33) > depthOfFocusNm(0.55));

    const inFocus = aerialImageDefocus({ na: 0.33, pitchNm: 40, sigma: 0.6, defocusNm: 0, illuminator: "annular" });
    const outFocus = aerialImageDefocus({ na: 0.33, pitchNm: 40, sigma: 0.6, defocusNm: 100, illuminator: "annular" });
    assert.ok(inFocus.contrast > outFocus.contrast);

    const stoch = simulateStochasticResist({
      intensity1d: inFocus.intensity,
      extentNm: inFocus.extentNm,
      doseMjCm2: 30,
    });
    assert.ok(Math.abs(stoch.arfToEuvPhotonRatio - 193.3 / 13.5) < 0.05);
    assert.ok(Number.isFinite(stoch.ler3SigmaNm) && stoch.ler3SigmaNm >= 0);
  });
});

describe("v1.0.0 WKB tunneling, Dirac e-/e+ dispersion, and silicon carriers", () => {
  it("evaluates WKB barrier leakage, Dirac hyperbola, and intrinsic silicon thermal runaway", () => {
    const thin = wkbTunnelTransmission({ energyEv: 0.25, barrierEv: 3.1, thicknessNm: 0.6, effMassRatio: 0.5 });
    const thick = wkbTunnelTransmission({ energyEv: 0.25, barrierEv: 3.1, thicknessNm: 2.0, effMassRatio: 0.5 });
    assert.ok(thin.transmission > thick.transmission * 1e6);

    const rest = diracDispersion(0);
    assert.ok(Math.abs(rest.electronMeV - ELECTRON_REST_MEV) < 1e-12);
    assert.ok(Math.abs(rest.electronMeV - rest.positronDiracSeaMeV - PAIR_THRESHOLD_MEV) < 1e-12);
    const fast = diracDispersion(1.0);
    assert.ok(fast.beta > 0.88 && fast.beta < 0.9 && fast.gamma > 2.1);

    const c300 = siliconIntrinsicCarriers(300);
    const c400 = siliconIntrinsicCarriers(400);
    assert.ok(c300.niCm3 > 5e9 && c300.niCm3 < 2e10, `300K ni=${c300.niCm3}`);
    assert.ok(c400.niCm3 > c300.niCm3 * 500);
    assert.ok(c400.egEv < c300.egEv);

    const ws = wellStates(2.0, 40);
    assert.equal(ws.grid.length, 81);
    assert.ok(ws.energies[0] > 0);
  });
});

describe("v1.0.0 LPDDR5X / UFS 4.1 Roofline & LLM memory wall", () => {
  it("classifies roofline bounds and computes memory-bound LLM decode speeds", () => {
    const memBound = rooflinePoint({ ai: 2, peakGflops: 5270, bwGBps: 76.8 });
    assert.equal(memBound.bound, "memory-bound");
    assert.ok(Math.abs(memBound.achievableGflops - 153.6) < 1e-9);

    const compBound = rooflinePoint({ ai: 200, peakGflops: 5270, bwGBps: 76.8 });
    assert.equal(compBound.bound, "compute-bound");
    assert.equal(compBound.achievableGflops, 5270);

    const int8 = llmDecodeCeiling({ paramsBillions: 2.0, bitsPerWeight: 8, bwGBps: 76.8, utilization: 0.72 });
    const bitnet = llmDecodeCeiling({
      paramsBillions: 2.0,
      bitsPerWeight: Math.log2(3),
      bwGBps: 76.8,
      utilization: 0.72,
    });
    assert.ok(int8.ceilingTokPerSec > 20 && int8.ceilingTokPerSec < 35);
    assert.ok(bitnet.ceilingTokPerSec > int8.ceilingTokPerSec * 2.5);
  });
});

describe("v1.0.0 Tsotchke quantum statevector & contextuality", () => {
  it("reproduces Bell CHSH 2*sqrt(2), Mermin-3 GHZ 4.0, Bloch purity, and Mermin-Peres 6/6", () => {
    const plus = applySingleQubit(createState(1), 0, GATES.H);
    const bvPlus = blochVector(plus, 0);
    assert.ok(Math.abs(bvPlus.x - 1) < 1e-12 && Math.abs(bvPlus.purity - 1) < 1e-12);

    const bell = createState(2);
    applySingleQubit(bell, 0, GATES.H);
    applyCnot(bell, 0, 1);
    const bvBell = blochVector(bell, 0);
    assert.ok(Math.abs(bvBell.purity - 0.5) < 1e-12);

    const chsh = runChshExperiment({ shots: 1000, angleDeg: 22.5, seed: 7 });
    assert.ok(Math.abs(Math.abs(chsh.sExact) - 2 * Math.SQRT2) < 1e-9);
    assert.equal(chsh.violatesClassical, true);

    const merm = runMermin3Experiment({ shots: 1000, phaseDeg: 0, seed: 7 });
    assert.ok(Math.abs(merm.mExact - 4) < 1e-9);
    assert.equal(merm.violatesClassical, true);

    const mp = merminPeresSummary();
    assert.equal(mp.quantumSatisfiedContexts, 6);
    assert.equal(mp.classicalMaxContexts, 5);
  });
});
