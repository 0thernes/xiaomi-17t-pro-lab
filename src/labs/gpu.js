import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { GPU_FP32_OPS_PER_CORE_PER_CYCLE, GPU_SHADER_CORES } from "../sim/constants.js";
import { gpuFp32Gflops } from "../sim/device-math.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { getSpecs } from "../specs.js";
import { runGpuMatmul } from "./gpu-run.js";
import { mountExplore } from "./explore.js";

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const levels = engineLevels(taxonomy, "gpu");
  const status = el("p", { class: "status", role: "status" }, ["Dispatching a checked matmul…"]);
  const resultHost = el("div");
  const explore = await mountExplore(cap, "gpu", levels);

  main.replaceChildren(
    el("h1", {}, ["GPU"]),
    el("p", { class: "lede" }, [
      "A square matrix product runs on WebGPU when this browser has it, otherwise on WebGL2. The tile renderer bins and shades in JavaScript on every visit. The 1716 MHz clock is published and unconfirmed.",
    ]),
    status,
    panel("Matmul", [resultHost]),
    explore.node,
    panel("Published clock, still unconfirmed", [
      kv(
        "Clock",
        el("span", {}, [
          `${specs.soc.gpu_clock_mhz.value} ${specs.soc.gpu_clock_mhz.unit} `,
          provCited(specs.soc.gpu_clock_mhz),
        ]),
      ),
      kv(
        "Cited peak",
        el("span", {}, [
          `${specs.soc.gpu_peak_fp32_tflops_derived.value} ${specs.soc.gpu_peak_fp32_tflops_derived.unit} `,
          provCited(specs.soc.gpu_peak_fp32_tflops_derived),
        ]),
      ),
      kv(
        "Formula check",
        el("span", {}, [
          `${fmt(gpuFp32Gflops(specs.soc.gpu_clock_mhz.value * 1e6) / 1000, 4)} TFLOPS `,
          provComputed(
            `${GPU_SHADER_CORES} × ${GPU_FP32_OPS_PER_CORE_PER_CYCLE} × 1716e6 / 1e12. Inherits the unconfirmed clock.`,
          ),
        ]),
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
      kv("GFLOPS", el("span", {}, [`${fmt(run.gflops, 4)} `, provMeasured(`2·N³ / time, N=${run.n}`)])),
      kv("Max |GPU − CPU|", el("span", {}, [`${fmt(run.maxAbsErr, 4)} `, provComputed("CPU Float64 reference")])),
      kv("Check", run.pass ? "within tolerance" : "FAILED the tolerance"),
    );
  }
  status.textContent = run ? `Matmul finished on ${run.backend}.` : "Matmul did not run.";
  return { dispose: () => explore.dispose() };
}
