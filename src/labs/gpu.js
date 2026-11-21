import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { GPU_FP32_OPS_PER_CORE_PER_CYCLE, GPU_SHADER_CORES } from "../sim/constants.js";
import { gpuFp32Gflops } from "../sim/device-math.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { rasterizeTiles } from "../sim/tiler.js";
import { getSpecs } from "../specs.js";
import { mountExplore } from "./explore.js";
import { runGpuMatmul } from "./gpu-run.js";

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const levels = engineLevels(taxonomy, "gpu");
  const status = el("p", { class: "status", role: "status" }, ["Dispatching live GPU matrix product…"]);
  const resultHost = el("div");
  const tilerHost = el("div", { class: "plot" });
  const tilerMeta = el("div");
  const explore = await mountExplore(cap, "gpu", levels);

  const sizeSelect = el("select", { "aria-label": "Matrix dimension N" }, [
    el("option", { value: "32" }, ["32 × 32 (65,536 FLOPs)"]),
    el("option", { value: "64", selected: true }, ["64 × 64 (524,288 FLOPs)"]),
    el("option", { value: "128" }, ["128 × 128 (4.19M FLOPs)"]),
  ]);
  const dispatchBtn = el("button", { type: "button", class: "primary" }, ["Run Checked GPU Matmul"]);
  const triSpread = rangeControl("TBDR Triangle Spread", 8, 30, 1, 26, (v) => `${v} px`);

  const gpuClockHz = specs.soc.gpu_clock_mhz.value * 1e6;
  const derivedTflops = gpuFp32Gflops(gpuClockHz) / 1000;

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["24.23 mm² · ARM 5TH GEN GPU"]),
      el("span", {}, ["MALI-G1 ULTRA MC12 · 12 SHADER CORES · 2 MiB L2 · RTUv2 · VULKAN 1.4"]),
    ]),
    el("h1", {}, ["GPU — Mali-G1 Ultra MC12, RTUv2 & Live Shader Compute"]),
    el("p", { class: "lede" }, [
      "Explore the 16-level GPU stack in 3D, run a checked WebGPU / WebGL2 square matrix product against an exact CPU Float64 reference, and interactively inspect Tile-Based Deferred Rendering (TBDR) bin occupancy.",
    ]),
    readoutGrid([
      readout("Shader Cores", `${GPU_SHADER_CORES}`, "cores", { tone: "cyan", sub: "1.55 mm² / core (Kurnal)" }),
      readout("FP32 / FP16 Rate", "256 / 512", "ops/clk", { tone: "accent", sub: "per core (FMA = 2 ops)" }),
      readout("Derived FP32 Peak", `${fmt(derivedTflops, 3)}`, "TFLOPS*", {
        tone: "warn",
        sub: "at 1716 MHz unconfirmed",
      }),
      readout("GPU L2 / RTU", "2 MiB", "RTUv2", { tone: "ok", sub: "Deferred Vertex Shading + CSF" }),
    ]),
    explore.node,
    el("div", { class: "grid cols-2" }, [
      panel(
        "Live WebGPU / WebGL2 Checked Matmul",
        [
          el("div", { class: "chips" }, [sizeSelect, dispatchBtn]),
          status,
          resultHost,
          kv(
            "Cited Clock",
            el("span", {}, [
              `${specs.soc.gpu_clock_mhz.value} ${specs.soc.gpu_clock_mhz.unit} `,
              provCited(specs.soc.gpu_clock_mhz),
            ]),
          ),
          kv(
            "Formula Check",
            el("span", {}, [
              `${fmt(derivedTflops, 4)} TFLOPS `,
              provComputed(`${GPU_SHADER_CORES} × ${GPU_FP32_OPS_PER_CORE_PER_CYCLE} × 1716 MHz`),
            ]),
          ),
        ],
        null,
        "MEASURED ON THIS GPU",
      ),
      panel(
        "Interactive TBDR Tile-Binner & Overdraw Heatmap",
        [triSpread.node, tilerHost, tilerMeta],
        null,
        "ARM 5TH GEN TBDR / DVS",
      ),
    ]),
  );

  const sketch = await mountSketch(tilerHost, drawTiler, { height: 240 });
  function updateTiler() {
    const s = Number(triSpread.input.value);
    const tris = [
      { x0: 2, y0: 2, x1: s, y1: 5, x2: 6, y2: s, r: 255, g: 105, b: 0 },
      { x0: 31 - s, y0: 4, x1: 30, y1: 30, x2: 14, y2: 31 - s / 2, r: 56, g: 212, b: 242 },
      { x0: 8, y0: 10, x1: 24, y1: 12, x2: 16, y2: 28, r: 167, g: 139, b: 250 },
    ];
    const res = rasterizeTiles(tris, { width: 32, height: 32, tileSize: 8 });
    const totalBins = res.tilesX * res.tilesY;
    const savedPct = (1 - res.touched / totalBins) * 100;
    tilerMeta.replaceChildren(
      kv("Active Tile Bins", `${res.touched} / ${totalBins} tiles (${res.shaded} pixels shaded)`),
      kv(
        "Skipped Empty Tiles",
        el("span", {}, [
          `${savedPct.toFixed(1)}% DRAM tile-writeback saved `,
          provComputed("on-chip tile SRAM stays local"),
        ]),
      ),
    );
    sketch.setState({ res });
  }
  triSpread.input.addEventListener("input", updateTiler);
  updateTiler();

  async function dispatch(nOverride) {
    dispatchBtn.disabled = true;
    const n = nOverride || Number(sizeSelect.value);
    status.textContent = `Running ${n}×${n} matmul on GPU…`;
    let run;
    try {
      const forceWebgl = new URLSearchParams(location.search).has("webgl");
      run = await runGpuMatmul(n, 11, { forceWebgl });
    } catch (error) {
      run = null;
      resultHost.replaceChildren(note(`No GPU matmul path ran: ${error.message}`));
    }
    if (run) {
      resultHost.replaceChildren(
        kv("Backend", el("span", {}, [run.backend, " ", provMeasured(run.note)])),
        kv("Throughput", el("span", {}, [`${fmt(run.gflops, 4)} GFLOPS `, provMeasured(`2·${run.n}³ / time`)])),
        kv("Max |GPU − CPU|", el("span", {}, [`${fmt(run.maxAbsErr, 4)} `, provComputed("vs Float64 CPU reference")])),
        kv("Verification", run.pass ? "within tolerance" : "FAILED tolerance"),
      );
    }
    status.textContent = run ? `Matmul N=${n} finished on ${run.backend}.` : "Matmul did not run.";
    dispatchBtn.disabled = false;
  }

  dispatchBtn.addEventListener("click", () => dispatch());
  await dispatch(32);

  return {
    dispose() {
      sketch.dispose();
      explore.dispose();
    },
  };
}

function drawTiler(p, state) {
  p.background("#06080c");
  const res = state.res;
  if (!res) return;
  const size = Math.min(p.height - 28, p.width * 0.45);
  const ox = 16;
  const oy = (p.height - size) / 2;
  const cell = size / 32;

  // Framebuffer output (left)
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const idx = (y * 32 + x) * 4;
      const r = res.framebuffer[idx];
      const g = res.framebuffer[idx + 1];
      const b = res.framebuffer[idx + 2];
      p.noStroke();
      p.fill(r || g || b ? p.color(r, g, b) : "#0f1522");
      p.rect(ox + x * cell, oy + y * cell, cell + 0.5, cell + 0.5);
    }
  }
  // 8x8 tile gridlines
  p.stroke("rgba(238,243,250,0.35)");
  p.strokeWeight(1);
  for (let i = 0; i <= 4; i++) {
    p.line(ox + i * (size / 4), oy, ox + i * (size / 4), oy + size);
    p.line(ox, oy + i * (size / 4), ox + size, oy + i * (size / 4));
  }

  // Tile bin depth heatmap (right)
  const ox2 = ox + size + 24;
  const tilePx = size / 4;
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const count = res.bins[ty * 4 + tx].length;
      p.fill(count === 0 ? "#0c111a" : count === 1 ? "#1b3a54" : count === 2 ? "#7a3b14" : "#ff6900");
      p.stroke("#26354d");
      p.rect(ox2 + tx * tilePx, oy + ty * tilePx, tilePx - 2, tilePx - 2, 4);
      p.noStroke();
      p.fill("#eef3fa");
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(12);
      p.text(`${count}Δ`, ox2 + tx * tilePx + tilePx / 2, oy + ty * tilePx + tilePx / 2);
    }
  }
  p.noStroke();
  p.fill("#9fb0c8");
  p.textAlign(p.LEFT, p.TOP);
  p.textSize(10);
  p.text("RASTERIZED 32×32", ox, 4);
  p.text("TBDR BIN DEPTH", ox2, 4);
}
