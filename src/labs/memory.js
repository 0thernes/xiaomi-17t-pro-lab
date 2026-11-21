import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { makeMaterials, mountView } from "../graphics/view.js";
import { scenePackage } from "../graphics/pu-scenes.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import {
  MEMORY_PROFILES,
  UFS_PROFILES,
  llmDecodeCeiling,
  probeBrowserMemoryCopy,
  rooflinePoint,
} from "../sim/memory-model.js";
import { gibPerSecond, streamBytes, triadKernel } from "../sim/stream.js";
import { getSpecs } from "../specs.js";

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "MT6993Z PoP stack with SK hynix LPDDR5X-9600 DRAM" });
  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["POP DRAM ", el("b", {}, ["SK hynix H58GG6AV9H · 9600 MT/s"])]),
      el("div", { class: "hud-chip" }, ["UFS 4.1 ", el("b", {}, ["SK hynix HN8T271EJK · 512 GB"])]),
    ]),
  );

  let view = null;
  try {
    view = await mountView(canvas, cap);
    const pkgScene = scenePackage(makeMaterials(cap.tier));
    view.root.add(pkgScene.group);
    view.frame(pkgScene.group, 0.86);
    view.setFrame(() => pkgScene.update(0.016));
  } catch (err) {
    stage.append(note(`WebGL unavailable: ${err.message}`));
  }

  // Controls for LLM Memory Wall & Roofline Calculator
  const paramsCtrl = rangeControl("Active Model Parameters (B)", 0.6, 14, 0.2, 2.0, (v) => `${v.toFixed(1)}B`);
  const bitsSelect = el("select", { "aria-label": "Weight precision" }, [
    el("option", { value: "16" }, ["FP16 / BF16 (16 bits/wt)"]),
    el("option", { value: "8", selected: true }, ["INT8 / A16W8 (8 bits/wt — Google LiteRT)"]),
    el("option", { value: "4" }, ["INT4 (4 bits/wt)"]),
    el("option", { value: String(Math.log2(3)) }, ["BitNet 1.58-bit (1.585 bits/wt — NPU 990)"]),
  ]);
  const dramSelect = el("select", { "aria-label": "LPDDR5X bus rate" }, [
    el("option", { value: "76.8", selected: true }, ["Xiaomi 17T Pro — LPDDR5X-9600 (76.8 GB/s)"]),
    el("option", { value: "85.336" }, ["Dimensity 9500 Max — LPDDR5X-10667 (85.3 GB/s)"]),
  ]);
  const utilCtrl = rangeControl("Achievable DRAM Efficiency", 0.4, 0.9, 0.02, 0.72, (v) => `${Math.round(v * 100)}%`);

  const roofHost = el("div", { class: "plot" });
  const llmOut = el("div");
  const benchBtn = el("button", { type: "button", class: "primary" }, ["Run STREAM Triad + 16 MB Copy Probe"]);
  const benchOut = el("div");

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["76.8 GB/s DRAM · 3.02 GB/s UFS 4.1"]),
      el("span", {}, ["SK HYNIX H58GG6AV9H PoP + HN8T271EJK FLASH · CS ROOFLINE"]),
    ]),
    el("h1", {}, ["Memory & Storage — LPDDR5X Ultra, UFS 4.1 & Roofline"]),
    el("p", { class: "lede" }, [
      "FCC 2AFZZPTC0G internal photos confirm SK hynix H58GG6AV9H (12 GB, 4×16-bit LPDDR5X-9600 = 76.8 GB/s PoP) and SK hynix HN8T271EJK (512 GB UFS 4.1). Explore the live CS Roofline ceiling, test your browser's STREAM triad bandwidth, and compute exact LLM memory-wall decode speeds.",
    ]),
    readoutGrid([
      readout("LPDDR5X-9600 BW", "76.8", "GB/s", { tone: "cyan", sub: "9600 MT/s × 64-bit ÷ 8" }),
      readout("SoC LPDDR5X Max", "85.3", "GB/s", { tone: "accent", sub: "MT6993 supports 10667 MT/s" }),
      readout("UFS 4.1 Seq Read", `${UFS_PROFILES.xiaomiMeasured.seqReadMBps}`, "MB/s", {
        tone: "ok",
        sub: "Notebookcheck AndroBench",
      }),
      readout("UFS 4.1 4K Rand", `${UFS_PROFILES.xiaomiMeasured.rand4kReadMBps}`, "MB/s", {
        tone: "cyan",
        sub: `~${(UFS_PROFILES.xiaomiMeasured.rand4kIops / 1000).toFixed(0)}k IOPS · MCQ`,
      }),
    ]),
    stage,
    el("div", { class: "grid cols-2" }, [
      panel(
        "CS Roofline Model — Memory Wall vs Compute Roof",
        [
          roofHost,
          note(
            "Log-log plot comparing Dimensity 9500's 76.8 GB/s LPDDR5X slope against GPU FP32 (5.27 TFLOPS*), GPU FP16 (10.54 TFLOPS*), and NPU 990 (100 TOPS*).",
          ),
        ],
        null,
        "COMPUTED · ARITHMETIC INTENSITY",
      ),
      panel(
        "LLM Autoregressive Decode & UFS Cold-Load Calculator",
        [el("div", { class: "chips" }, [bitsSelect, dramSelect]), paramsCtrl.node, utilCtrl.node, llmOut],
        null,
        "BANDWIDTH BOUND · tok/s ≤ BW / Weights",
      ),
    ]),
    el("div", { class: "grid cols-2" }, [
      panel("Live Browser STREAM Triad & Memory Copy Benchmark", [benchBtn, benchOut], null, "MEASURED ON THIS DEVICE"),
      panel(
        "FCC 2AFZZPTC0G & Kernel Hardware Audit",
        [
          kv("Fitted DRAM IC", el("span", {}, [MEMORY_PROFILES.xiaomi17tPro.part, " ", provCited(specs.parts.dram)])),
          kv("Fitted UFS 4.1 IC", el("span", {}, [UFS_PROFILES.xiaomiMeasured.part, " ", provCited(specs.parts.ufs)])),
          kv(
            "UFS Lane Topology",
            el("span", {}, [
              "2-lane single package (SoC supports dual 2-lane = 4-lane) ",
              provCited(specs.device.ufs_lane_count_device),
            ]),
          ),
          kv(
            "Kernel Storage Features",
            el("span", {}, ["HS-G5 · MCQ · Xiaomi WriteBooster / FBO / Swap-SLC ", provCited(specs.versions.kernel)]),
          ),
          kv(
            "USB-C Bottleneck",
            el("span", {}, [
              "USB 2.0 measured 23.16 MB/s — 130× slower than internal UFS 4.1 ",
              provCited(specs.device.phone_usb_data),
            ]),
          ),
        ],
        null,
        "WARHOL KERNEL + FCC EXHIBITS",
      ),
    ]),
  );

  const sketch = await mountSketch(roofHost, drawRoofline, { height: 270 });

  function updateModels() {
    const paramsBillions = Number(paramsCtrl.input.value);
    const bitsPerWeight = Number(bitsSelect.value);
    const bwGBps = Number(dramSelect.value);
    const utilization = Number(utilCtrl.input.value);
    const res = llmDecodeCeiling({ paramsBillions, bitsPerWeight, bwGBps, utilization });
    const gpuRidge = rooflinePoint({ ai: 1, peakGflops: 5270, bwGBps }).ridgeAi;
    const npuRidge = rooflinePoint({ ai: 1, peakGflops: 100000, bwGBps }).ridgeAi;

    llmOut.replaceChildren(
      kv(
        "Weight Footprint",
        el("span", {}, [
          `${fmt(res.weightsGB, 3)} GB (+ ${fmt(res.kvCacheGB, 3)} GB 4K KV) `,
          provComputed("Params × bits / 8"),
        ]),
      ),
      kv(
        "Memory-Wall Decode Ceiling",
        el("span", {}, [
          `${fmt(res.ceilingTokPerSec, 3)} tok/s `,
          provComputed(`${fmt(res.effectiveBwGBps, 3)} GB/s ÷ ${fmt(res.bytesPerTokenGB, 3)} GB/tok`),
        ]),
      ),
      kv(
        "UFS 4.1 Cold-Load Time",
        el("span", {}, [`${fmt(res.modelLoadSecUfs, 3)} s `, provComputed(`weights ÷ 3021.5 MB/s`)]),
      ),
      kv(
        "Roofline Ridge Points",
        el("span", {}, [
          `GPU FP32: ${fmt(gpuRidge, 3)} FLOP/B · NPU: ${fmt(npuRidge, 4)} OP/B `,
          provComputed("Peak ÷ DRAM BW"),
        ]),
      ),
      note(
        "Notice how Gemma 3n E2B (~2B active) at INT8 hits ~28–30 tok/s on 76.8 GB/s LPDDR5X — matching Google & MediaTek's published 28 tok/s decode!",
      ),
    );
    sketch.setState({ bwGBps, bitsPerWeight, res });
  }

  for (const c of [paramsCtrl.input, utilCtrl.input]) c.addEventListener("input", updateModels);
  for (const s of [bitsSelect, dramSelect]) s.addEventListener("change", updateModels);
  updateModels();

  async function runMemBench() {
    benchBtn.disabled = true;
    const n = 524288; // 512K Float64 -> 4 MB per array, 12 MB triad
    const a = new Float64Array(n);
    const b = new Float64Array(n).fill(1.25);
    const c = new Float64Array(n).fill(2.5);
    triadKernel(a, b, c, 3.0); // warmup
    const times = [];
    for (let t = 0; t < 4; t++) {
      const t0 = performance.now();
      triadKernel(a, b, c, 3.0);
      times.push(performance.now() - t0);
    }
    const bestMs = Math.min(...times);
    const bytesMoved = streamBytes(n, 8).triad;
    const triadGBps = gibPerSecond(bytesMoved, bestMs);
    const copy = await probeBrowserMemoryCopy(16);
    benchOut.replaceChildren(
      kv(
        "STREAM Triad (12 MB)",
        el("span", {}, [
          `${fmt(triadGBps, 3)} GB/s `,
          provMeasured(`a[i]=b[i]+3·c[i], best of 4 (${bestMs.toFixed(2)} ms)`),
        ]),
      ),
      kv(
        "16 MB TypedArray Copy",
        el("span", {}, [
          `${fmt(copy.copyGBps, 3)} GB/s `,
          provMeasured(`32 MB moved in ${copy.elapsedMs.toFixed(2)} ms`),
        ]),
      ),
      kv(
        "Vs 17T Pro LPDDR5X-9600",
        el("span", {}, [
          `${fmt((triadGBps / 76.8) * 100, 3)}% of phone theoretical 76.8 GB/s `,
          provComputed("single JS thread vs 4-ch HW"),
        ]),
      ),
    );
    benchBtn.disabled = false;
  }

  benchBtn.addEventListener("click", runMemBench);
  await runMemBench();

  return {
    dispose() {
      sketch.dispose();
      view?.dispose();
    },
  };
}

function drawRoofline(p, state) {
  p.background("#06080c");
  const bw = state.bwGBps || 76.8;
  const padL = 56;
  const padR = 20;
  const padT = 22;
  const padB = 34;
  const w = p.width - padL - padR;
  const h = p.height - padT - padB;

  const xMin = -1; // 0.1 FLOP/B
  const xMax = 3.5; // ~3160 FLOP/B
  const yMin = 0.5; // ~3 GFLOPS
  const yMax = 5.2; // ~160 TFLOPS

  const xOf = (ai) => padL + ((Math.log10(ai) - xMin) / (xMax - xMin)) * w;
  const yOf = (gf) => padT + h - ((Math.log10(Math.max(1, gf)) - yMin) / (yMax - yMin)) * h;

  // Log grid
  p.stroke("#192334");
  p.strokeWeight(1);
  for (let gx = -1; gx <= 3; gx++) {
    const x = xOf(10 ** gx);
    p.line(x, padT, x, padT + h);
    p.noStroke();
    p.fill("#6f819c");
    p.textSize(9);
    p.textAlign(p.CENTER, p.TOP);
    p.text(`10^${gx}`, x, padT + h + 6);
    p.stroke("#192334");
  }
  for (let gy = 1; gy <= 5; gy++) {
    const y = yOf(10 ** gy);
    p.line(padL, y, padL + w, y);
    p.noStroke();
    p.fill("#6f819c");
    p.textSize(9);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(gy >= 3 ? `${10 ** (gy - 3)}T` : `${10 ** gy}G`, padL - 6, y);
    p.stroke("#192334");
  }

  const roofs = [
    { label: "NPU 990 (100 TOPS*)", peak: 100000, col: "#a78bfa" },
    { label: "Mali-G1 FP16 (10.5T*)", peak: 10540, col: "#38d4f2" },
    { label: "Mali-G1 FP32 (5.27T*)", peak: 5270, col: "#ff6900" },
  ];

  for (const r of roofs) {
    p.stroke(r.col);
    p.strokeWeight(2.2);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= 60; i++) {
      const ai = 10 ** (xMin + (i / 60) * (xMax - xMin));
      const val = Math.min(r.peak, ai * bw);
      p.vertex(xOf(ai), yOf(val));
    }
    p.endShape();
    p.noStroke();
    p.fill(r.col);
    p.textSize(9.5);
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.text(r.label, padL + w - 4, yOf(r.peak) - 3);
  }

  // Operating point markers: LLM Decode (AI ~ 1-2) vs Prefill (AI ~ 256)
  const pts = [
    { ai: 1.2, name: "LLM Decode (BW-Bound)", col: "#4ade80" },
    { ai: 220, name: "LLM Prefill / Conv", col: "#fbbf24" },
  ];
  for (const pt of pts) {
    const y = Math.min(100000, pt.ai * bw);
    p.fill(pt.col);
    p.noStroke();
    p.circle(xOf(pt.ai), yOf(y), 8);
    p.textSize(9.5);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(pt.name, xOf(pt.ai) + 7, yOf(y));
  }

  p.fill("#9fb0c8");
  p.textSize(10);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.text("Arithmetic Intensity (FLOPs / Byte)", padL + w / 2, p.height - 2);
}
