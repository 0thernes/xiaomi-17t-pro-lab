/**
 * Reproducible Rust -> WebAssembly SIMD128 build script for `src/sim/fast-kernels.wasm`.
 * Requires: `rustc` + `cargo` with `wasm32-unknown-unknown` target installed.
 */
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const outWasm = path.join(ROOT, "src", "sim", "fast-kernels.wasm");

const run = spawnSync("cargo", ["build", "--target", "wasm32-unknown-unknown", "--release"], {
  cwd: HERE,
  stdio: "inherit",
});
if (run.status !== 0) {
  process.exit(run.status || 1);
}

const built = path.join(HERE, "target", "wasm32-unknown-unknown", "release", "xiaomi_kernels.wasm");
copyFileSync(built, outWasm);
const bytes = readFileSync(outWasm);
const sha = createHash("sha256").update(bytes).digest("hex");
console.log(`Built ${path.relative(ROOT, outWasm)} (${bytes.byteLength} bytes, sha256=${sha})`);
