import specs from "../../data/specs.json" with { type: "json" };
import {
  fillUnit,
  matmulFlops,
  matmulFp,
  matmulQuantized,
  mulberry32,
  quantizeSymmetricInt8,
  rmse,
  ternarizeAbsMean,
} from "../sim/quant.js";
import { loadKernels } from "../sim/wasm.js";
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";

export async function mount(main) {
  const n = 24;
  const rng = mulberry32(19);
  const A = fillUnit(n * n, rng);
  const B = fillUnit(n * n, rng);
  const fp = matmulFp(A, B, n);
  const int8A = quantizeSymmetricInt8(A);
  const int8B = quantizeSymmetricInt8(B);
  const int8 = time(() => matmulQuantized(int8A.q, int8A.scale, int8B.q, int8B.scale, n));
  const tern = ternarizeAbsMean(A);
  const ternC = time(() => matmulQuantized(tern.q, tern.scale, B, 1, n));
  const wasm = await wasmInt8Rate(int8A.q, int8B.q, n);

  const webnn =
    "ml" in navigator
      ? "navigator.ml is present. This page does not claim that backend is NPU 990."
      : "navigator.ml is absent.";

  main.replaceChildren(
    el("h1", {}, ["NPU concepts, not the NPU"]),
    el("p", { class: "lede warn" }, [
      "These products run in JavaScript and WASM on the CPU thread this browser scheduled. They do not run on the MediaTek NPU 990 or the CIM Super Efficient NPU. A web page cannot dispatch to that accelerator.",
    ]),
    panel("What is published", [
      kv("Name", el("span", {}, [specs.soc.npu_name.value, " ", provCited(specs.soc.npu_name)])),
      kv("BitNet", el("span", {}, [specs.soc.npu_bitnet.value, " ", provCited(specs.soc.npu_bitnet)])),
      kv(
        "Context",
        el("span", {}, [
          `${fmt(specs.soc.npu_context_tokens.value, 6)} tokens `,
          provCited(specs.soc.npu_context_tokens),
        ]),
      ),
      kv("TOPS", el("span", {}, ["UNKNOWN ", provCited(specs.soc.npu_tops)])),
      kv("Tokens per second", el("span", {}, ["UNKNOWN ", provCited(specs.soc.npu_llm_tokens_per_s)])),
      kv(
        "Part number",
        el("span", {}, [
          "MT6990 vs MT6993Z, unresolved ",
          provCited({
            value: "conflict",
            status: "unconfirmed",
            source: "https://developers.google.com/edge/litert/next/mediatek",
          }),
        ]),
      ),
      note(
        "MediaTek’s “2× tokens” and “100% faster 3B LLM” are relative claims. They are not an absolute tokens/s figure, so none is printed.",
      ),
      note(webnn),
    ]),
    panel(`INT8 matmul, N=${n}`, [
      kv(
        "RMSE versus FP32",
        el("span", {}, [
          `${fmt(rmse(fp, int8.value), 4)} `,
          provComputed("dequantized int8 product minus FP32 product"),
        ]),
      ),
      kv(
        "JS rate",
        el("span", {}, [`${fmt(rate(n, int8.ms), 4)} GFLOPS `, provMeasured("JS integer inner products, not the NPU")]),
      ),
      kv(
        "WASM int8 dot rate",
        el("span", {}, [
          `${fmt(wasm.gops, 4)} Gops/s `,
          provMeasured(`wasm i32.load8_s dots, checked acc ${wasm.check}`),
        ]),
      ),
    ]),
    panel("1.58-bit weights", [
      kv("Bits per ternary weight", el("span", {}, [`${fmt(tern.bitsPerWeight, 5)} `, provComputed("log2(3)")])),
      kv(
        "RMSE versus FP32",
        el("span", {}, [
          `${fmt(rmse(fp, ternC.value), 4)} `,
          provComputed("absmean ternarize, activations left in FP32"),
        ]),
      ),
      kv(
        "JS rate",
        el("span", {}, [`${fmt(rate(n, ternC.ms), 4)} GFLOPS `, provMeasured("JS, not BitNet on the 990")]),
      ),
      note(
        "Ternary weights are clip(round(W / mean|W|), −1, 1). Activation dtype inside the real NPU is UNKNOWN. The 128K context is a cited capacity, not a buffer this page allocates.",
      ),
    ]),
    contextPanel(),
  );
  return { dispose() {} };
}

function rate(n, ms) {
  return matmulFlops(n) / (ms / 1000) / 1e9;
}

function time(fn) {
  fn();
  const t0 = performance.now();
  const value = fn();
  return { value, ms: Math.max(performance.now() - t0, 1e-3) };
}

async function wasmInt8Rate(Aq, Bq, n) {
  const kernels = await loadKernels();
  const mem = new Int8Array(kernels.memory.buffer);
  const offA = 0;
  const offB = n * n;
  mem.set(Aq, offA);
  mem.set(Bq, offB);
  const check = kernels.int8_dot(offA, offB, n);
  let js = 0;
  for (let k = 0; k < n; k++) js += Aq[k] * Bq[k];
  const reps = 2000;
  const t0 = performance.now();
  let sink = 0;
  for (let r = 0; r < reps; r++) sink += kernels.int8_dot(offA, offB + (r % n) * 0, n);
  const ms = Math.max(performance.now() - t0, 1e-3);
  return { gops: (reps * n) / (ms / 1000) / 1e9, check: check === js ? "matches JS" : "MISMATCH", sink };
}

function contextPanel() {
  const tokens = el("input", {
    type: "range",
    min: "1024",
    max: "131072",
    step: "1024",
    value: "4096",
    "aria-label": "Software context length",
  });
  const out = el("div");
  const dim = 256;
  function update() {
    const count = Number(tokens.value);
    const bytes = count * dim * 2;
    out.replaceChildren(
      kv(
        "Byte count of a toy FP16 embedding",
        el("span", {}, [`${fmt(bytes, 4)} bytes `, provComputed(`${count} × ${dim} × 2`)]),
      ),
      note(
        "Arithmetic only. The buffer is not allocated. 131072 is past the cited 128000 so the slider can show the official window and a step beyond it.",
      ),
    );
  }
  tokens.addEventListener("input", update);
  update();
  return panel("Context as a memory model", [
    el("label", { class: "slider" }, [el("span", {}, ["Tokens"]), tokens, el("output", {}, [])]),
    out,
    kv("Cited window", el("span", {}, ["128000 tokens ", provCited(specs.soc.npu_context_tokens)])),
  ]);
}
