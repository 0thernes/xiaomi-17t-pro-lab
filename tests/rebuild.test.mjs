import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { chaseJumps } from "../src/sim/cache-curve.js";
import { dopri54, rk4, robertsonDeriv } from "../src/sim/ode.js";
import { createPipeline } from "../src/sim/pipeline.js";
import { rasterizeTiles } from "../src/sim/tiler.js";
import { chooseTier } from "../src/quality.js";
import { floorplan, npuCounts, openItems, parseDieMm, parsePackageMm } from "../src/specs.js";
import { REFERENCES } from "../src/references.js";
import { buildWeights, greedyTokens } from "../src/workloads/gpt-neo.js";
import { parseSafetensors } from "../src/workloads/safetensors.js";
import { GPT2Tokenizer } from "../src/workloads/tokenizer.js";

describe("corrected geometry", () => {
  it("reads the Kurnal die, the MT6993Z package, and four plus two NPU units", () => {
    const die = parseDieMm();
    assert.equal(die.widthMm, 10.88);
    assert.equal(die.heightMm, 12.92);
    assert.equal(die.areaMm2, 140.57);
    const pkg = parsePackageMm();
    assert.equal(pkg.widthMm, 16.4);
    assert.equal(pkg.heightMm, 14);
    assert.equal(pkg.thickMm, 0.455);
    const plan = floorplan();
    const cpu = plan.blocks.find((block) => block.id === "cpu");
    assert.ok(Math.abs(cpu.widthMm * cpu.heightMm - 28.75) < 1e-9);
    assert.ok(plan.blocks.reduce((sum, block) => sum + block.heightMm, 0) < die.heightMm);
    assert.equal(npuCounts().mdla, 4);
    assert.equal(npuCounts().mvpu, 2);
    assert.equal(openItems().length, 9);
    assert.ok(openItems().every((item) => item.reason && item.reason.length > 8));
  });

  it("does not ship copyrighted reference photographs", () => {
    for (const item of REFERENCES) {
      assert.equal(item.shipped, null, item.id);
      assert.ok(item.url.startsWith("https://"));
      assert.ok(item.license.length > 8);
    }
  });
});

describe("live models", () => {
  it("stalls a dependent load and shades a binned triangle", () => {
    const pipe = createPipeline(
      [
        { op: "load", dst: 1, addr: 0 },
        { op: "add", dst: 2, a: 1, b: 1 },
      ],
      { loadLatency: 3 },
    );
    let last = null;
    for (let i = 0; i < 12; i++) last = pipe.tick();
    assert.ok(last.stalls > 0);
    assert.equal(last.regs[2], 14);
    const image = rasterizeTiles([{ x0: 0, y0: 0, x1: 10, y1: 0, x2: 0, y2: 10, r: 9, g: 8, b: 7 }], {
      width: 16,
      height: 16,
      tileSize: 8,
    });
    assert.equal(image.framebuffer[(1 * 16 + 1) * 4], 9);
    assert.equal(image.framebuffer[(15 * 16 + 15) * 4], 0);
    assert.ok(image.bins[0].includes(0));
    assert.ok(image.bins.at(-1).includes(0));
  });

  it("integrates decay, and keeps Robertson positive", () => {
    const decay = rk4((_t, y) => new Float64Array([-y[0]]), [1], { t1: 1, dt: 0.001 });
    assert.ok(Math.abs(decay.y[0] - Math.exp(-1)) < 1e-6);
    const stiff = dopri54(robertsonDeriv, [1, 0, 0], { t1: 0.3, dt: 1e-4, tol: 1e-6, maxSteps: 20000 });
    assert.ok(stiff.y[0] > 0 && stiff.y[1] >= 0 && stiff.y[2] >= 0);
    assert.ok(Math.abs(stiff.y[0] + stiff.y[1] + stiff.y[2] - 1) < 1e-3);
    const jumps = chaseJumps([
      { bytes: 1024, nsPerLoad: 2 },
      { bytes: 4096, nsPerLoad: 2.1 },
      { bytes: 1_000_000, nsPerLoad: 8 },
    ]);
    assert.equal(jumps.length, 1);
    assert.equal(jumps[0].bytes, 1_000_000);
  });

  it("does not read orientation when choosing a tier", () => {
    const src = readFileSync(new URL("../src/quality.js", import.meta.url), "utf8");
    assert.equal(/matchMedia\(\s*["']\(orientation|screen\.orientation|innerWidth|innerHeight/.test(src), false);
    const base = { memoryGb: 8, cores: 8, coarse: false, renderer: "nvidia", benchMs: 4 };
    assert.equal(chooseTier(base), chooseTier({ ...base, orientation: "landscape", width: 2400 }));
  });
});

describe("tinystories", () => {
  it("greedy-decodes the pinned float16 checkpoint", () => {
    const file = readFileSync(new URL("../vendor/tinystories/model.f16.safetensors", import.meta.url));
    const recorded = readFileSync(new URL("../vendor/tinystories/SHA256.txt", import.meta.url), "utf8");
    const vocab = JSON.parse(readFileSync(new URL("../vendor/tinystories/vocab.json", import.meta.url), "utf8"));
    const merges = readFileSync(new URL("../vendor/tinystories/merges.txt", import.meta.url), "utf8");
    const tokenizer = new GPT2Tokenizer(vocab, merges);
    const prompt = tokenizer.encode("Once upon a time");
    const weights = buildWeights(
      parseSafetensors(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)).tensors,
    );
    const tokens = greedyTokens(weights, prompt, 8);
    assert.deepEqual(tokens, [11, 612, 373, 257, 1310, 2576, 3706, 20037]);
    assert.equal(tokenizer.decode(tokens).includes("Lily"), true);
    assert.ok(recorded.includes("model.f16.safetensors"));
  });
});
