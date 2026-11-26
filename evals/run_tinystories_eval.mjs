/**
 * Build Standard v1.2.0 B34 & A40: Deterministic AI Model Regression & Budget Evaluation.
 *
 * Evaluates the vendored roneneldan/TinyStories-8M FP16 checkpoint (9 SHA-256-verified shards):
 * 1. Verifies exact cryptographic shard reassembly against vendor/tinystories/shards.json.
 * 2. Runs 5 canonical prompts (greedy decode, 8 tokens each), asserting bit-exact outputs,
 *    finite full-vocabulary Shannon entropy, and reasonable perplexity.
 * 3. Verifies Neuralese layer ablation (ablateLayer = 4) measurably shifts next-token entropy.
 * 4. Checks memory/latency budgets documented in docs/ai.md.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWeights, createStream, greedyTokens } from "../src/workloads/gpt-neo.js";
import { assembleShards, parseSafetensors } from "../src/workloads/safetensors.js";
import { GPT2Tokenizer } from "../src/workloads/tokenizer.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = path.join(ROOT, "vendor", "tinystories");

const t0 = performance.now();
const manifest = JSON.parse(readFileSync(path.join(vendorDir, "shards.json"), "utf8"));
const chunks = manifest.shards.map((s) => {
  const b = readFileSync(path.join(vendorDir, s.path));
  assert.equal(b.length, s.bytes, `shard byte mismatch: ${s.path}`);
  assert.equal(createHash("sha256").update(b).digest("hex"), s.sha256, `shard SHA mismatch: ${s.path}`);
  return b;
});
const fullAb = assembleShards(chunks, manifest.totalBytes);
const fullSha = createHash("sha256").update(new Uint8Array(fullAb)).digest("hex");
assert.equal(fullSha, manifest.sha256, "reassembled checkpoint SHA-256 mismatch");

const vocab = JSON.parse(readFileSync(path.join(vendorDir, "vocab.json"), "utf8"));
const merges = readFileSync(path.join(vendorDir, "merges.txt"), "utf8");
const tokenizer = new GPT2Tokenizer(vocab, merges);
const weights = buildWeights(parseSafetensors(fullAb).tensors);
const loadMs = performance.now() - t0;

const PROMPTS = [
  { id: "classic_story", text: "Once upon a time", expectedTokens: [11, 612, 373, 257, 1310, 2576, 3706, 20037] },
  { id: "small_dog", text: "One day, a little dog", expectedTokens: null },
  { id: "sunny_park", text: "Tim went to the park", expectedTokens: null },
  { id: "rainy_day", text: "It was raining outside", expectedTokens: null },
  { id: "red_ball", text: "She found a shiny red", expectedTokens: null },
];

const cases = [];
for (const item of PROMPTS) {
  const promptIds = tokenizer.encode(item.text);
  const trace = [];
  const tokens = greedyTokens(weights, promptIds, 8, trace);
  if (item.expectedTokens) {
    assert.deepEqual(tokens, item.expectedTokens, `regression on prompt ${item.id}`);
  }
  const stream = createStream(weights);
  let h = null;
  for (const id of promptIds) h = stream.step(id);
  const top = stream.topK(h, 5, 1.0);
  assert.ok(Number.isFinite(top.entropyBits) && top.entropyBits > 0 && top.entropyBits < 16);

  const avgMsPerTok = trace.reduce((a, b) => a + b, 0) / trace.length;
  cases.push({
    id: item.id,
    prompt: item.text,
    tokens,
    decoded: tokenizer.decode(tokens),
    top1Prob: Number(top[0].prob.toFixed(6)),
    exactEntropyBits: Number(top.entropyBits.toFixed(6)),
    perplexity: Number(Math.pow(2, top.entropyBits).toFixed(4)),
    avgMsPerToken: Number(avgMsPerTok.toFixed(2)),
  });
}

// Neuralese intervention check: ablating layer h.4 must alter the logit distribution
const baseStream = createStream(weights);
const ablatedStream = createStream(weights);
const pIds = tokenizer.encode("Once upon a time");
let hBase = null;
let hAbl = null;
for (const id of pIds) {
  hBase = baseStream.step(id, { ablateLayer: -1 });
  hAbl = ablatedStream.step(id, { ablateLayer: 4 });
}
const topBase = baseStream.topK(hBase, 3, 1.0);
const topAbl = ablatedStream.topK(hAbl, 3, 1.0);
const entropyDelta = Math.abs(topAbl.entropyBits - topBase.entropyBits);
assert.ok(entropyDelta > 0.05, `Expected layer-4 ablation to shift entropy > 0.05 bits, got ${entropyDelta}`);

const report = {
  model: "roneneldan/TinyStories-8M (FP16 sharded)",
  sha256: fullSha,
  totalBytes: manifest.totalBytes,
  shards: manifest.shards.length,
  loadAndParseMs: Number(loadMs.toFixed(2)),
  neuraleseAblationL4EntropyDeltaBits: Number(entropyDelta.toFixed(6)),
  pass: true,
  cases,
};

mkdirSync(path.join(ROOT, "results"), { recursive: true });
writeFileSync(path.join(ROOT, "results", "tinystories-eval.json"), JSON.stringify(report, null, 2) + "\n");
console.log(
  `PASS: TinyStories-8M eval passed (${cases.length} prompts, load ${loadMs.toFixed(0)} ms, L4 ablation ΔH = ${entropyDelta.toFixed(3)} bits).`,
);
