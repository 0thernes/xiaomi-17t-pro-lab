/**
 * One-shot packer. Reads the F32 TinyStories safetensors (not committed; it is
 * over GitHub's 100 MB limit) and writes an F16 safetensors file.
 * Usage: node tools/pack-tinystories.mjs /path/to/model.safetensors
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseSafetensors, floatToHalf } from "../src/workloads/safetensors.js";
import { buildWeights, greedyTokens } from "../src/workloads/gpt-neo.js";
import { GPT2Tokenizer } from "../src/workloads/tokenizer.js";

const src = process.argv[2];
if (!src) {
  console.error("need a source safetensors path");
  process.exit(1);
}
const vocab = JSON.parse(readFileSync(new URL("../vendor/tinystories/vocab.json", import.meta.url), "utf8"));
const merges = readFileSync(new URL("../vendor/tinystories/merges.txt", import.meta.url), "utf8");
const tokenizer = new GPT2Tokenizer(vocab, merges);
const prompt = "Once upon a time";
const promptIds = tokenizer.encode(prompt);
console.log("prompt", promptIds);

const srcBuf = readFileSync(src);
const parsed = parseSafetensors(srcBuf.buffer.slice(srcBuf.byteOffset, srcBuf.byteOffset + srcBuf.byteLength));
const weights = buildWeights(parsed.tensors);
const f32Tokens = greedyTokens(weights, promptIds, 8);
console.log("f32", f32Tokens, tokenizer.decode(f32Tokens));

const header = { __metadata__: { source: "roneneldan/TinyStories-8M F32 packed to F16" } };
const parts = [];
let offset = 0;
for (const [name, meta] of Object.entries(parsed.header)) {
  if (name === "__metadata__") continue;
  if (meta.dtype !== "F32") continue;
  const tensor = parsed.tensors[name];
  const bytes = new Uint8Array(tensor.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < tensor.length; i++) view.setUint16(i * 2, floatToHalf(tensor[i]), true);
  const pad = (8 - (offset % 8)) % 8;
  offset += pad;
  header[name] = { dtype: "F16", shape: meta.shape, data_offsets: [offset, offset + bytes.length] };
  parts.push({ pad, bytes });
  offset += bytes.length;
}
const headerBytes = Buffer.from(JSON.stringify(header));
const out = Buffer.alloc(8 + headerBytes.length + offset);
out.writeBigUInt64LE(BigInt(headerBytes.length), 0);
headerBytes.copy(out, 8);
let cursor = 8 + headerBytes.length;
for (const part of parts) {
  cursor += part.pad;
  Buffer.from(part.bytes.buffer).copy(out, cursor);
  cursor += part.bytes.length;
}
const dest = new URL("../vendor/tinystories/model.f16.safetensors", import.meta.url);
writeFileSync(dest, out);
const sha = createHash("sha256").update(out).digest("hex");
writeFileSync(new URL("../vendor/tinystories/SHA256.txt", import.meta.url), `${sha}  model.f16.safetensors\n`);
console.log("wrote", out.length, sha);

const again = parseSafetensors(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
const f16Tokens = greedyTokens(buildWeights(again.tensors), promptIds, 8);
console.log("f16", f16Tokens, tokenizer.decode(f16Tokens));
