import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { DOCUMENTED_WORDS, decodeA64 } from "../src/sim/a64.js";
import { buildChase, chase, cycleLength } from "../src/sim/chase.js";
import {
  CLUSTER,
  EUV_LAMBDA_NM,
  HBAR2_OVER_2M_EV_NM2,
  K1_PHYSICAL_LIMIT,
  NA_HIGH,
  NA_LOW,
} from "../src/sim/constants.js";
import { buildComparison } from "../src/sim/compare-model.js";
import {
  colorsForBitsPerChannel,
  computedPpi,
  cmosDynamicPower,
  gpuFp32Gflops,
  siliconNearestNeighbor,
  ultraToProPowerRatio,
  upperHz,
} from "../src/sim/device-math.js";
import { fftRadix2 } from "../src/sim/fft.js";
import { doubleGateScaleLength, potentialDecay } from "../src/sim/finfet.js";
import { energyAtAlphaA, kronigPenneyAllowed, kronigPenneyRhs } from "../src/sim/kronig.js";
import { aerialImage } from "../src/sim/lithography.js";
import {
  fillUnit,
  matmulFlops,
  matmulFp,
  matmulQuantized,
  maxAbsErr,
  mulberry32,
  quantizeSymmetricInt8,
  rmse,
  ternarizeAbsMean,
} from "../src/sim/quant.js";
import { euvReference, impliedK1, rayleighCd } from "../src/sim/rayleigh.js";
import { infiniteWellAnalyticEv, infiniteWellEnergies, jacobiEigenvalues } from "../src/sim/schrodinger.js";
import { median, quantizationUncertaintyPerStep, timerSigma } from "../src/sim/stats.js";
import { gibPerSecond, streamBytes, theoreticalDramGBps, triadKernel } from "../src/sim/stream.js";
import { deviceChain, engineLevels, facetCoverage } from "../src/sim/taxonomy-walk.js";
import { validateSpecs } from "../src/sim/validate-specs.js";
import { VERSION } from "../src/version.js";
import { loadKernels } from "../src/sim/wasm.js";
import specs from "../data/specs.json" with { type: "json" };
import taxonomy from "../data/taxonomy.json" with { type: "json" };

describe("version", () => {
  it("matches package.json and VERSION", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const file = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();
    assert.equal(VERSION, "0.1.0");
    assert.equal(pkg.version, VERSION);
    assert.equal(file, VERSION);
  });
});

describe("specs integrity", () => {
  it("every leaf has source and status, and unknowns are null", () => {
    const errors = validateSpecs(specs);
    assert.deepEqual(errors, []);
  });

  it("cluster tokens in code are the official cluster string", () => {
    const text = specs.soc.cpu_cluster.value;
    for (const core of CLUSTER) {
      assert.ok(text.includes(String(core.ghz)), text);
    }
    assert.ok(text.includes("2MB"));
    assert.ok(text.includes("1MB"));
    assert.ok(text.includes("512KB"));
    assert.equal(specs.soc.l3_mb.value, 16);
    assert.equal(specs.soc.slc_mb.value, 10);
    assert.equal(specs.soc.l1_cache_bytes.status, "unknown");
    assert.equal(specs.soc.l1_cache_bytes.value, null);
    assert.equal(specs.soc.gpu_clock_mhz.status, "unknown");
    assert.equal(specs.soc.npu_tops.status, "unknown");
    assert.equal(specs.soc.transistor_architecture.value, "FinFET");
  });
});

describe("taxonomy", () => {
  it("keeps the researched stack depths and facets", () => {
    assert.equal(engineLevels(taxonomy, "cpu").length, 15);
    assert.equal(engineLevels(taxonomy, "gpu").length, 16);
    assert.equal(engineLevels(taxonomy, "npu").length, 14);
    for (const id of ["cpu", "gpu", "npu"]) {
      for (const level of engineLevels(taxonomy, id)) {
        for (const key of taxonomy.meta.facet_keys_engines) {
          assert.ok(level.facets[key], `${level.id} missing ${key}`);
        }
      }
    }
    const chain = deviceChain(taxonomy, ["soc", "soc_cpu"]);
    assert.equal(chain.at(-1).id, "soc_cpu");
    assert.equal(deviceChain(taxonomy, ["nope"]), null);
    const cov = facetCoverage(engineLevels(taxonomy, "cpu")[0].facets);
    assert.equal(cov.total, taxonomy.meta.facet_keys_engines.length);
  });
});

describe("rayleigh and aerial image", () => {
  it("matches the worked k1 = 0.25 limits", () => {
    const low = rayleighCd(K1_PHYSICAL_LIMIT, NA_LOW);
    const high = rayleighCd(K1_PHYSICAL_LIMIT, NA_HIGH);
    assert.ok(Math.abs(low - 10.227272727) < 1e-9);
    assert.ok(Math.abs(high - 6.136363636) < 1e-9);
    const ref = euvReference();
    assert.ok(Math.abs(ref.asmlImpliedK1Low - (13 * 0.33) / 13.5) < 1e-12);
    assert.ok(Math.abs(impliedK1(8, 0.55) - (8 * 0.55) / 13.5) < 1e-12);
  });

  it("round-trips an FFT", () => {
    const re = Float64Array.from([1, 2, 3, 4, 5, 0, -1, 0.5]);
    const im = new Float64Array(re.length);
    const original = Float64Array.from(re);
    fftRadix2(re, im, false);
    fftRadix2(re, im, true);
    for (let i = 0; i < re.length; i++) {
      assert.ok(Math.abs(re[i] - original[i]) < 1e-9);
      assert.ok(Math.abs(im[i]) < 1e-9);
    }
  });

  it("images a clear field as intensity 1 and drops contrast past the coherent cutoff", () => {
    const clear = aerialImage({ na: NA_LOW, pitchNm: 40, duty: 1, sigma: 0, n: 128, periods: 2 });
    for (const v of clear.intensity) assert.ok(Math.abs(v - 1) < 1e-6);

    const fine = aerialImage({ na: NA_LOW, pitchNm: 16, duty: 0.5, sigma: 0, n: 256 });
    assert.equal(fine.firstOrderPassesCoherent, false);
    assert.ok(fine.contrast < 0.05, `fine contrast ${fine.contrast}`);

    const coarse = aerialImage({ na: NA_LOW, pitchNm: 80, duty: 0.5, sigma: 0, n: 256 });
    assert.equal(coarse.firstOrderPassesCoherent, true);
    assert.ok(coarse.contrast > 0.4, `coarse contrast ${coarse.contrast}`);
    assert.equal(EUV_LAMBDA_NM, 13.5);
  });
});

describe("schrodinger, Kronig-Penney, FinFET", () => {
  it("diagonalizes a 2×2 exactly", () => {
    const ev = jacobiEigenvalues([
      [2, 1],
      [1, 2],
    ]);
    assert.ok(Math.abs(ev[0] - 1) < 1e-8);
    assert.ok(Math.abs(ev[1] - 3) < 1e-8);
  });

  it("matches analytic infinite-well energies", () => {
    const L = 2;
    const nPoints = 48;
    const got = infiniteWellEnergies(L, nPoints);
    for (let n = 1; n <= 3; n++) {
      const analytic = infiniteWellAnalyticEv(L, n);
      const rel = Math.abs(got[n - 1] - analytic) / analytic;
      assert.ok(rel < 0.01, `n=${n} fd=${got[n - 1]} analytic=${analytic} rel=${rel}`);
    }
    assert.ok(HBAR2_OVER_2M_EV_NM2 > 0.03 && HBAR2_OVER_2M_EV_NM2 < 0.05);
  });

  it("opens a Kronig-Penney gap above αa = π and is free when P = 0", () => {
    const a = 0.543;
    const atPi = energyAtAlphaA(Math.PI, a);
    assert.ok(Math.abs(kronigPenneyRhs(atPi, a, 3) - -1) < 1e-9);
    assert.equal(kronigPenneyAllowed(atPi, a, 3), true);
    const above = energyAtAlphaA(Math.PI + 0.25, a);
    assert.equal(kronigPenneyAllowed(above, a, 3), false);
    assert.equal(kronigPenneyAllowed(1.7, a, 0), true);
  });

  it("matches a hand-evaluated double-gate scale length", () => {
    const lambda = doubleGateScaleLength(11.7, 6, 3.9, 1);
    const expected = Math.sqrt((11.7 * 6 * 1) / (2 * 3.9));
    assert.ok(Math.abs(lambda - expected) < 1e-12);
    assert.ok(Math.abs(potentialDecay(lambda, lambda) - Math.exp(-1)) < 1e-12);
  });
});

describe("quantized matmul", () => {
  it("int8 round-trips an exactly representable product", () => {
    const n = 4;
    const A = new Float64Array([127, 0, -127, 64, 10, 20, 30, 40, -5, 6, -7, 8, 1, 2, 3, 4]);
    const B = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const aq = quantizeSymmetricInt8(A);
    const bq = quantizeSymmetricInt8(B);
    const fp = matmulFp(A, B, n);
    const q = matmulQuantized(aq.q, aq.scale, bq.q, bq.scale, n);
    assert.ok(maxAbsErr(fp, q) < 1e-6);
  });

  it("ternary weights use log2(3) bits and lose more than int8", () => {
    const n = 8;
    const rng = mulberry32(7);
    const A = fillUnit(n * n, rng);
    const B = fillUnit(n * n, rng);
    const fp = matmulFp(A, B, n);
    const aq = quantizeSymmetricInt8(A);
    const bq = quantizeSymmetricInt8(B);
    const int8 = matmulQuantized(aq.q, aq.scale, bq.q, bq.scale, n);
    const tw = ternarizeAbsMean(A);
    assert.ok(Math.abs(tw.bitsPerWeight - Math.log2(3)) < 1e-12);
    const tern = matmulQuantized(tw.q, tw.scale, B, 1, n);
    assert.ok(rmse(fp, int8) < rmse(fp, tern));
    assert.equal(matmulFlops(n), 2 * n * n * n);
  });
});

describe("a64, chase, stream, device math", () => {
  it("decodes only the documented words", () => {
    assert.equal(decodeA64(DOCUMENTED_WORDS.NOP).mnemonic, "NOP");
    assert.equal(decodeA64(DOCUMENTED_WORDS.RET_X30).mnemonic, "RET");
    assert.equal(decodeA64(DOCUMENTED_WORDS.SVC_0).mnemonic, "SVC #0");
    assert.equal(decodeA64(DOCUMENTED_WORDS.ADD_X0_X1_X2).mnemonic, "ADD X0, X1, X2");
    assert.equal(decodeA64(0xffffffff), null);
  });

  it("builds a single chase cycle", () => {
    const built = buildChase(64 * 32, mulberry32(3));
    assert.equal(cycleLength(built.buf, built.start), built.nodes);
    const sink = chase(built.buf, built.start, built.nodes);
    assert.equal(sink, built.start);
  });

  it("counts STREAM bytes and refuses an unknown DRAM width", () => {
    const a = new Float64Array([0, 0]);
    const b = new Float64Array([1, 2]);
    const c = new Float64Array([3, 4]);
    triadKernel(a, b, c, 2);
    assert.deepEqual(Array.from(a), [7, 10]);
    assert.equal(streamBytes(1000, 8).triad, 24000);
    assert.equal(theoreticalDramGBps(9600, null), null);
    assert.ok(Math.abs(gibPerSecond(1e9, 1000) - 1) < 1e-12);
  });

  it("computes PPI, color count, and the clock power ratio without inventing C or V", () => {
    const ppi = computedPpi(2772, 1280, 6.83);
    assert.ok(Math.abs(ppi - 447) < 0.2);
    assert.equal(colorsForBitsPerChannel(12), 2 ** 36);
    assert.equal(colorsForBitsPerChannel(8), 2 ** 24);
    const ratio = ultraToProPowerRatio();
    assert.ok(Math.abs(ratio - 4.21 / 2.7) < 1e-12);
    const symbolic = cmosDynamicPower({ alpha: null, capacitance: null, voltage: null, freqHz: 4.21e9 });
    assert.equal(symbolic.power, null);
    assert.equal(gpuFp32Gflops(null), null);
    assert.ok(Math.abs(gpuFp32Gflops(1e9) - 12 * 256) < 1e-9);
    const nn = siliconNearestNeighbor();
    assert.ok(Math.abs(nn - (5.431020511e-10 * Math.sqrt(3)) / 4) < 1e-18);
    assert.equal(upperHz("1-120"), 120);
    assert.equal(median([1, 9, 3]), 3);
    assert.ok(Math.abs(timerSigma(100) - 100 / Math.sqrt(12)) < 1e-12);
    assert.ok(quantizationUncertaintyPerStep(0.1, 1000) > 0);
  });
});

describe("comparison model", () => {
  it("computes Steel Nomad stability from cited scores and leaves iPhone GB6 unknown", () => {
    const model = buildComparison();
    const snl = model.snlStability.xiaomi.ratio;
    assert.ok(Math.abs(snl - 1871 / 2476) < 1e-12);
    const gb6 = model.rows.find((r) => r.id === "gb6_single");
    assert.equal(gb6.iphone.text, "UNKNOWN");
    assert.equal(gb6.xiaomi.numeric, 2903);
    assert.equal(gb6.samsung.numeric, 3753);
    assert.equal(model.scoreboard.geekbench6_cpu_phonearena.value, "galaxy_s26_ultra");
    assert.ok(Math.abs(model.ppi.xiaomiComputed.ppi - 447) < 0.2);
    assert.equal(model.ppi.samsungCited, null);
    assert.ok(model.ppi.samsungComputed.ppi > 490 && model.ppi.samsungComputed.ppi < 510);
  });
});

describe("wasm kernels", () => {
  it("matches the scalar lane math and an int8 dot", async () => {
    const k = await loadKernels();
    assert.ok(Math.abs(k.simd_f32x4_adds(10) - 1.0011) < 1e-5);
    const mem = new Int8Array(k.memory.buffer);
    const A = [1, -2, 3, 0];
    const B = [4, 5, -6, 7];
    A.forEach((v, i) => (mem[i] = v));
    B.forEach((v, i) => (mem[32 + i] = v));
    assert.equal(k.int8_dot(0, 32, 4), 1 * 4 + -2 * 5 + 3 * -6 + 0 * 7);
  });
});
