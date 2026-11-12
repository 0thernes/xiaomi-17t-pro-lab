import specs from "../../data/specs.json" with { type: "json" };
import { GPU_FP32_OPS_PER_CORE_PER_CYCLE, GPU_SHADER_CORES } from "../sim/constants.js";
import { gpuFp32Gflops } from "../sim/device-math.js";
import { binTriangles } from "../sim/dvs.js";
import { mulberry32 } from "../sim/quant.js";
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { mountSketch } from "../p5-loader.js";
import { runGpuMatmul } from "./gpu-run.js";

export async function mount(main, { cap }) {
  const status = el("p", { class: "status", role: "status" }, ["Dispatching a checked matmul…"]);
  const resultHost = el("div");
  const plotHost = el("div", { class: "plot" });
  const formulaHost = el("div");
  main.replaceChildren(
    el("h1", {}, ["GPU, measured here"]),
    el("p", { class: "lede" }, [
      "A square matrix product runs on WebGPU when this browser has it, otherwise on WebGL2. The CPU repeats the product and the page reports the error. Mali counters, the Neural queue, and the official GPU clock are not available to a web page.",
    ]),
    status,
    panel("Matmul", [resultHost]),
    panel("Official peak, clock left symbolic", [formulaHost]),
    panel("Binning sketch", [
      plotHost,
      note(
        "Bounding boxes of random triangles, counted into a grid. A teaching model of a binning pass, not Deferred Vertex Shading on the Mali-G1 and not a firmware trace. Warp width 16 and 2048 threads are cited Arm counter-reference figures, not a measurement of this draw.",
      ),
    ]),
  );

  let run;
  try {
    const forceWebgl = new URLSearchParams(location.search).has("webgl");
    run = await runGpuMatmul(32, 11, { forceWebgl });
  } catch (error) {
    run = null;
    resultHost.append(note(`No GPU matmul path ran: ${error.message}`));
  }
  if (run) {
    resultHost.append(
      kv("Backend", el("span", {}, [run.backend, " ", provMeasured(run.note)])),
      kv(
        "GFLOPS",
        el("span", {}, [`${fmt(run.gflops, 4)} `, provMeasured(`2·N³ / time, N=${run.n}, includes readback`)]),
      ),
      kv(
        "Max |GPU − CPU|",
        el("span", {}, [`${fmt(run.maxAbsErr, 4)} `, provComputed("same matrices, CPU Float64 reference")]),
      ),
      kv("Check", run.pass ? "within tolerance" : "FAILED the tolerance"),
      note(
        cap.webgpu
          ? "navigator.gpu was present at startup. The backend line says which path actually ran."
          : "navigator.gpu was absent at startup.",
      ),
    );
  }
  status.textContent = run ? `Matmul finished on ${run.backend}.` : "Matmul did not run.";

  const freq = el("input", {
    type: "range",
    min: "0",
    max: "2000",
    value: "0",
    step: "10",
    "aria-label": "Illustrative GPU clock in MHz",
  });
  const freqOut = el("output", {}, ["clock unknown"]);
  const gflopsOut = el("div");
  function updateFormula() {
    const mhz = Number(freq.value);
    freqOut.textContent = mhz === 0 ? "clock unknown" : `${mhz} MHz illustrative`;
    gflopsOut.replaceChildren();
    if (mhz === 0) {
      gflopsOut.append(kv("FP32 GFLOPS", el("span", {}, ["UNKNOWN ", provCited(specs.soc.gpu_clock_mhz)])));
    } else {
      const value = gpuFp32Gflops(mhz * 1e6);
      gflopsOut.append(
        kv(
          "FP32 GFLOPS at this slider",
          el("span", {}, [
            `${fmt(value, 4)} `,
            provComputed(`${GPU_SHADER_CORES} × ${GPU_FP32_OPS_PER_CORE_PER_CYCLE} × ${mhz}e6 / 1e9`),
          ]),
        ),
      );
    }
  }
  freq.addEventListener("input", updateFormula);
  updateFormula();
  formulaHost.append(
    el("label", { class: "slider" }, [
      el("span", {}, ["Illustrative clock. 0 means unpublished. Moving it does not measure the phone."]),
      freq,
      freqOut,
    ]),
    gflopsOut,
    note("Arm counts each FMA as two operations. 1716 MHz shows up in aggregators and is not used."),
  );

  const binned = binTriangles({ count: 48, binsX: 8, binsY: 16, random: mulberry32(4) });
  const sketch = await mountSketch(plotHost, (p, state) => drawBins(p, state));
  sketch.setState(binned);
  plotHost.append(
    note(
      `${binned.touched} of ${binned.binsX * binned.binsY} bins touched by ${binned.triangles} boxes. ${provInline()}`,
    ),
  );

  return { dispose: () => sketch.dispose() };
}

function provInline() {
  return "COMPUTED bbox overlap. CITED warp 16 is not drawn as a measured occupancy.";
}

function drawBins(p, state) {
  p.background("#1c1e18");
  if (!state.bins) return;
  const pad = 16;
  const cellW = (p.width - pad * 2) / state.binsX;
  const cellH = (p.height - pad * 2) / state.binsY;
  let max = 1;
  for (const value of state.bins) max = Math.max(max, value);
  for (let j = 0; j < state.binsY; j++) {
    for (let i = 0; i < state.binsX; i++) {
      const value = state.bins[j * state.binsX + i];
      const t = value / max;
      p.noStroke();
      p.fill(40 + t * 180, 50 + t * 40, 30);
      p.rect(pad + i * cellW, pad + j * cellH, cellW - 2, cellH - 2);
    }
  }
}
