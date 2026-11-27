/**
 * Build Standard v1.2.0 B13: Semantic Mutation Testing Harness.
 *
 * Plants 8 realistic domain/security mutants into temporary copies of source modules
 * inside OS temp space, runs the unit test suite against each mutant via isolated
 * worktree copy (leaving the working tree untouched), and verifies 8/8 (100%) are killed.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MUTANTS = [
  {
    id: "M1",
    file: "src/sim/rayleigh.js",
    desc: "Rayleigh CD drops NA division (k1 * lambda * na)",
    find: "return (k1 * lambda) / na;",
    replace: "return k1 * lambda * na;",
  },
  {
    id: "M2",
    file: "src/sim/dirac-tunnel.js",
    desc: "WKB transmission drops factor of 2 in exponent",
    find: "const transmission = Math.exp(-2 * kappa * thicknessNm);",
    replace: "const transmission = Math.exp(-kappa * thicknessNm);",
  },
  {
    id: "M3",
    file: "src/sim/dirac-tunnel.js",
    desc: "Dirac energy flips sign inside square root",
    find: "const E = Math.sqrt(pMeVc * pMeVc + mc2 * mc2);",
    replace: "const E = Math.sqrt(Math.abs(pMeVc * pMeVc - mc2 * mc2));",
  },
  {
    id: "M4",
    file: "src/sim/tdse.js",
    desc: "Crank-Nicolson breaks unitarity by dropping diagonal imaginary term",
    find: "const dI = -(diagBaseImag + s * V[i]);",
    replace: "const dI = +(diagBaseImag + s * V[i]);",
  },
  {
    id: "M5",
    file: "src/sim/quantum-lab.js",
    desc: "CHSH flips e11 sign (collapses quantum violation)",
    find: "const sExact = e00.exact + e01.exact + e10.exact - e11.exact;",
    replace: "const sExact = e00.exact + e01.exact + e10.exact + e11.exact;",
  },
  {
    id: "M6",
    file: "src/sim/memory-model.js",
    desc: "Roofline uses Math.max instead of Math.min",
    find: "const achievable = Math.min(peakGflops, memCap);",
    replace: "const achievable = Math.max(peakGflops, memCap);",
  },
  {
    id: "M7",
    file: "src/sim/thermal-fdtd.js",
    desc: "Thermal setAmbient drops finite guard (allows NaN poisoning)",
    find: 'if (!Number.isFinite(val)) throw new RangeError("ambient temperature must be finite");',
    replace: "/* mutant: NaN guard removed */",
  },
  {
    id: "M8",
    file: "tools/serve.mjs",
    desc: "Static server resolveSafe drops path-traversal check",
    find: 'if (relative.startsWith("..") || path.isAbsolute(relative)) return null;',
    replace: "/* mutant: traversal guard removed */",
  },
  {
    id: "M9",
    file: "src/sim/catalytic-arena.js",
    desc: "Catalytic XOR restoration drops second XOR pass (corrupts borrowed bytes)",
    find: "fastKernels.exports.catalytic_xor_simd(bSlice.ptr, mSlice.ptr, n);\n      hostBytes.set(bSlice.view());\n    } finally {",
    replace: "/* mutant: restoration pass skipped */\n      hostBytes.set(bSlice.view());\n    } finally {",
  },
  {
    id: "M10",
    file: "src/workloads/safetensors.js",
    desc: "FP16 LUT corrupts IEEE-754 exponent bias (127 - 15 -> 127 - 14)",
    find: "_scratchU32[0] = sign | ((exp + (127 - 15)) << 23) | (mant << 13);",
    replace: "_scratchU32[0] = sign | ((exp + (127 - 14)) << 23) | (mant << 13);",
  },
];

const stage = mkdtempSync(path.join(tmpdir(), "xiaomi-lab-mutants-"));
let killed = 0;
const results = [];

try {
  // Copy only the lightweight directories required for unit tests (skip vendor/tinystories shards for speed)
  for (const dir of ["src", "tests", "tools", "data"]) {
    cpSync(path.join(ROOT, dir), path.join(stage, dir), { recursive: true });
  }
  for (const file of ["package.json", "VERSION", "index.html"]) {
    cpSync(path.join(ROOT, file), path.join(stage, file));
  }
  // Minimal assets stub for JPEG HEAD check
  cpSync(
    path.join(ROOT, "assets", "textures", "cc0", "metal_plate", "metal_plate_diff_1k.jpg"),
    path.join(stage, "assets", "textures", "cc0", "metal_plate", "metal_plate_diff_1k.jpg"),
  );

  // Fast subset of test files that cover all 10 mutant targets without 8s TinyStories decode
  const fastTests = [
    "tests/engines.test.mjs",
    "tests/v1-engines.test.mjs",
    "tests/v2-engines.test.mjs",
    "tests/catalytic-wasm.test.mjs",
    "tests/server.test.mjs",
    "tests/properties-and-regressions.test.mjs",
  ];

  for (const m of MUTANTS) {
    const targetPath = path.join(stage, m.file);
    const original = readFileSync(targetPath, "utf8");
    if (!original.includes(m.find)) {
      throw new Error(`Mutant ${m.id} pattern not found in ${m.file}`);
    }
    writeFileSync(targetPath, original.replace(m.find, m.replace));
    const run = spawnSync(process.execPath, ["--test", ...fastTests], {
      cwd: stage,
      encoding: "utf8",
    });
    writeFileSync(targetPath, original);
    const wasKilled = run.status !== 0;
    if (wasKilled) killed += 1;
    results.push({ id: m.id, file: m.file, desc: m.desc, killed: wasKilled });
    console.log(`${wasKilled ? "KILLED" : "SURVIVED"}  ${m.id} (${m.file}): ${m.desc}`);
  }
} finally {
  rmSync(stage, { recursive: true, force: true });
}

console.log(`\nMutation score: ${killed}/${MUTANTS.length} (${((100 * killed) / MUTANTS.length).toFixed(1)}%)`);
if (killed !== MUTANTS.length) {
  process.exit(1);
}
