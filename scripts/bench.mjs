/**
 * Build Standard v1.2.0 B26 & A37: Reproducible Solver Performance Benchmarks.
 * Records hardware metadata, median, IQR, p95, and hard latency budgets to results/perf-benchmarks.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { braggSpectrum, simulateStochasticResist, aerialImageDefocus } from "../src/sim/litho-advanced.js";
import { simulateLitho2d } from "../src/sim/litho-2d.js";
import { fillUnit, matmulFp, matmulQuantized, mulberry32, quantizeSymmetricInt8 } from "../src/sim/quant.js";
import { runChshExperiment, runMermin3Experiment } from "../src/sim/quantum-lab.js";
import { infiniteWellEnergies } from "../src/sim/schrodinger.js";
import { createWavePacketSim } from "../src/sim/tdse.js";
import { createDieThermalGrid } from "../src/sim/thermal-fdtd.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function measure(name, budgetMs, iters, fn) {
  // Warmup
  fn();
  const times = [];
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const q = (p) => times[Math.min(times.length - 1, Math.floor(p * times.length))];
  const median = q(0.5);
  const p25 = q(0.25);
  const p75 = q(0.75);
  const p95 = q(0.95);
  return {
    name,
    iterations: iters,
    medianMs: Number(median.toFixed(4)),
    iqrMs: Number((p75 - p25).toFixed(4)),
    p95Ms: Number(p95.toFixed(4)),
    budgetMs,
    withinBudget: median <= budgetMs,
  };
}

const rng = mulberry32(42);
const matA = fillUnit(64 * 64, rng);
const matB = fillUnit(64 * 64, rng);
const qA = quantizeSymmetricInt8(matA);
const qB = quantizeSymmetricInt8(matB);
const tdse = createWavePacketSim({ n: 240 });
const thermal = createDieThermalGrid({ nx: 44, ny: 52 });
const aerial1d = aerialImageDefocus({ na: 0.33, pitchNm: 36, sigma: 0.5 });

const benchmarks = [
  measure("bragg_40pair_81pt_spectrum", 15, 25, () => braggSpectrum({ pairs: 40, samples: 81 })),
  measure("litho_2d_64x64_annular_opc", 40, 20, () => simulateLitho2d({ pattern: "sram6t", opc: true, n: 64 })),
  measure("stochastic_resist_48x256", 20, 20, () =>
    simulateStochasticResist({ intensity1d: aerial1d.intensity, extentNm: aerial1d.extentNm, doseMjCm2: 30 }),
  ),
  measure("tdse_crank_nicolson_50steps_n240", 15, 30, () => tdse.step(50)),
  measure("thermal_fdtd_44x52_frame_80ms", 15, 30, () => thermal.step(0.08)),
  measure("schrodinger_jacobi_n48", 25, 15, () => infiniteWellEnergies(3.0, 48)),
  measure("quant_int8_matmul_64x64", 10, 40, () => matmulQuantized(qA.q, qA.scale, qB.q, qB.scale, 64)),
  measure("fp64_matmul_64x64", 10, 40, () => matmulFp(matA, matB, 64)),
  measure("chsh_and_mermin3_2000shots", 15, 25, () => {
    runChshExperiment({ shots: 2000, angleDeg: 22.5, seed: 42 });
    runMermin3Experiment({ shots: 2000, phaseDeg: 0, seed: 9500 });
  }),
];

const report = {
  generatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  platform: `${process.platform}-${process.arch}`,
  cpuModel: os.cpus()[0]?.model || "unknown",
  cpuCores: os.cpus().length,
  allWithinBudget: benchmarks.every((b) => b.withinBudget),
  benchmarks,
};

mkdirSync(path.join(ROOT, "results"), { recursive: true });
writeFileSync(path.join(ROOT, "results", "perf-benchmarks.json"), JSON.stringify(report, null, 2) + "\n");
for (const b of benchmarks) {
  console.log(
    `${b.withinBudget ? "PASS" : "WARN"}  ${b.name.padEnd(36)} median=${b.medianMs.toFixed(3)}ms  IQR=${b.iqrMs.toFixed(3)}ms  p95=${b.p95Ms.toFixed(3)}ms  (budget ${b.budgetMs}ms)`,
  );
}
