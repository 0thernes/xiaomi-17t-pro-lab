import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import {
  fillUnit,
  matmulFp,
  matmulQuantized,
  mulberry32,
  quantizeSymmetricInt8,
  rmse,
  ternarizeAbsMean,
} from "../sim/quant.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { loadKernels } from "../sim/wasm.js";
import { getSpecs, npuCounts } from "../specs.js";
import { mountExplore } from "./explore.js";

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const counts = npuCounts();
  const levels = engineLevels(taxonomy, "npu");
  const explore = await mountExplore(cap, "npu", levels);

  const dimCtrl = rangeControl("Matrix Size N×N", 8, 32, 4, 12, (v) => `${v}×${v}`);
  const plotHost = el("div", { class: "plot" });
  const quantMeta = el("div");
  const wasmHost = el("div");

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["12.60 mm² · NPU 990 + CIM"]),
      el("span", {}, ["4× MDLA + 2× MVPU · 7 MiB L1 / 4 MiB L2 · BITNET 1.58-BIT · 128K CTX"]),
    ]),
    el("h1", {}, ["NPU 990 & Compute-In-Memory Quantization Lab"]),
    el("p", { class: "lede warn" }, [
      "Honest runtime boundary: these integer and ternary products execute live in JavaScript and WASM on your browser's CPU thread. They do not run on the MediaTek NPU 990 or the CIM Super Efficient NPU — browsers cannot dispatch to NeuroPilot.",
    ]),
    readoutGrid([
      readout("NPU Engines", `${counts.mdla} + ${counts.mvpu}`, "MDLA/MVPU", {
        tone: "cyan",
        sub: "1.81 / 0.62 mm² (Kurnal)",
      }),
      readout("On-Chip SRAM", "7 / 4", "MiB L1/L2", { tone: "ok", sub: "mt6993 compiler target" }),
      readout("Published Rating", `${specs.soc.npu_tops.value}`, "TOPS*", { tone: "warn", sub: "precision unstated" }),
      readout("Gemma 3n E2B", "28 / 1600+", "tok/s", { tone: "accent", sub: "Google + MediaTek LiteRT" }),
    ]),
    explore.node,
    el("div", { class: "grid cols-2" }, [
      panel(
        "Live FP64 vs INT8 vs BitNet 1.58-Bit Quantization Error",
        [dimCtrl.node, plotHost, quantMeta],
        null,
        "COMPUTED LIVE",
      ),
      panel(
        "Published NPU 990 Architecture & WASM INT8 Dot",
        [
          kv("Structure", el("span", {}, [`${counts.mdla}× MDLA + ${counts.mvpu}× MVPU `, provCited(counts.entry)])),
          kv(
            "Silicon Area",
            el("span", {}, [`${specs.soc.die_block_npu990_mm2.value} mm² `, provCited(specs.soc.die_block_npu990_mm2)]),
          ),
          kv(
            "Precisions",
            el("span", {}, [
              String(specs.soc.npu_precisions_documented.value),
              " ",
              provCited(specs.soc.npu_precisions_documented),
            ]),
          ),
          kv(
            "BitNet Native",
            el("span", {}, [
              `${specs.soc.npu_bitnet.value} (${specs.soc.npu_context_tokens.value.toLocaleString()} ctx) `,
              provCited(specs.soc.npu_bitnet),
            ]),
          ),
          wasmHost,
        ],
        null,
        "Kurnal + Google LiteRT + WASM",
      ),
    ]),
  );

  const sketch = await mountSketch(plotHost, drawQuantHeat, { height: 240 });

  function recompute() {
    const n = Number(dimCtrl.input.value);
    const rng = mulberry32(9);
    const A = fillUnit(n * n, rng);
    const B = fillUnit(n * n, rng);
    const fp = matmulFp(A, B, n);
    const aq = quantizeSymmetricInt8(A);
    const bq = quantizeSymmetricInt8(B);
    const int8 = matmulQuantized(aq.q, aq.scale, bq.q, bq.scale, n);
    const tw = ternarizeAbsMean(A);
    const bitnet = matmulQuantized(tw.q, tw.scale, B, 1, n);
    const errInt8 = rmse(fp, int8);
    const errTern = rmse(fp, bitnet);

    quantMeta.replaceChildren(
      kv("INT8 (A8W8) RMSE", el("span", {}, [`${fmt(errInt8, 5)} `, provComputed(`symmetric int8 vs FP64, N=${n}`)])),
      kv(
        "BitNet 1.58-bit RMSE",
        el("span", {}, [`${fmt(errTern, 5)} `, provComputed(`{-1,0,+1} absmean, log₂(3)=1.585 bits/wt`)]),
      ),
      kv(
        "Weight Footprint Reduction",
        el("span", {}, ["5.05× vs INT8 · 20.2× vs FP32 ", provComputed("32 / log₂(3)")]),
      ),
    );
    sketch.setState({ n, fp, int8, bitnet });
  }

  dimCtrl.input.addEventListener("input", recompute);
  recompute();

  try {
    const k = await loadKernels();
    const mem = new Int8Array(k.memory.buffer);
    for (let i = 0; i < 64; i++) {
      mem[i] = ((i * 19) % 120) - 60;
      mem[64 + i] = ((i * 31) % 120) - 60;
    }
    const t0 = performance.now();
    let acc = 0;
    for (let rep = 0; rep < 200000; rep++) acc += k.int8_dot(0, 64, 64);
    const ms = Math.max(0.01, performance.now() - t0);
    const mops = (200000 * 64 * 2) / (ms * 1e3);
    wasmHost.replaceChildren(
      kv(
        "WASM INT8 Dot Kernel",
        el("span", {}, [`${fmt(mops, 3)} MOPS `, provMeasured(`64-elem dot × 200k, sum=${acc}`)]),
      ),
    );
  } catch (err) {
    wasmHost.replaceChildren(note(`WASM INT8 dot skipped: ${err.message}`));
  }

  return {
    dispose() {
      sketch.dispose();
      explore.dispose();
    },
  };
}

function drawQuantHeat(p, state) {
  p.background("#06080c");
  const { n, fp, int8, bitnet } = state;
  if (!n || !fp) return;
  const pad = 16;
  const box = Math.min(p.height - 44, (p.width - pad * 4) / 3);
  const panels = [
    ["FP64 Reference", fp, false],
    ["|FP64 − INT8| Error", fp.map((v, i) => Math.abs(v - int8[i])), true],
    ["|FP64 − BitNet 1.58b|", fp.map((v, i) => Math.abs(v - bitnet[i])), true],
  ];
  let maxVal = 1e-6;
  for (const v of fp) maxVal = Math.max(maxVal, Math.abs(v));
  let maxErr = 1e-6;
  for (let i = 0; i < fp.length; i++) maxErr = Math.max(maxErr, Math.abs(fp[i] - bitnet[i]));

  panels.forEach(([title, arr, isErr], idx) => {
    const ox = pad + idx * (box + pad);
    const oy = 26;
    const cell = box / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = arr[r * n + c];
        if (isErr) {
          const t = Math.min(1, v / maxErr);
          p.fill(p.lerpColor(p.color("#0e1522"), p.color("#ff6900"), t));
        } else {
          const t = (v / maxVal) * 0.5 + 0.5;
          p.fill(p.lerpColor(p.color("#38d4f2"), p.color("#a78bfa"), t));
        }
        p.noStroke();
        p.rect(ox + c * cell, oy + r * cell, cell - 0.5, cell - 0.5);
      }
    }
    p.noStroke();
    p.fill("#9fb0c8");
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    p.text(title, ox, 8);
  });
}
