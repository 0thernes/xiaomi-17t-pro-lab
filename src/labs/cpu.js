import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel, readout, readoutGrid } from "../dom.js";
import { fmt, fmtBytes } from "../format.js";
import { enableCrossOriginIsolation, isolationStatus } from "../isolation.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { DOCUMENTED_WORDS, decodeA64 } from "../sim/a64.js";
import { chaseJumps, referenceMarks } from "../sim/cache-curve.js";
import { buildChase, timeChase } from "../sim/chase.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { loadKernels } from "../sim/wasm.js";
import { getSpecs } from "../specs.js";
import { mountExplore } from "./explore.js";

const SIZES = [16 * 1024, 64 * 1024, 256 * 1024, 1024 * 1024, 4 * 1024 * 1024, 16 * 1024 * 1024];

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const levels = engineLevels(taxonomy, "cpu");
  const iso = isolationStatus();
  const status = el("p", { class: "status", role: "status" }, ["Running live pointer-chase & WASM SIMD sweeps…"]);
  const explore = await mountExplore(cap, "cpu", levels);

  const chasePlotHost = el("div", { class: "plot" });
  const chaseListHost = el("div");
  const simdHost = el("div");

  // Tighten timers button for GitHub Pages COOP/COEP
  const coiBtn = el("button", { type: "button", class: "btn" }, [
    iso.isolated ? "Timers Isolated (5 µs)" : "Tighten Timers (COOP/COEP)",
  ]);
  coiBtn.disabled = iso.isolated;
  coiBtn.addEventListener("click", async () => {
    coiBtn.disabled = true;
    coiBtn.textContent = "Registering COI worker…";
    await enableCrossOriginIsolation();
  });

  // Interactive ARMv9.3-A A64 Bit-Level Decoder
  const a64Select = el(
    "select",
    { "aria-label": "ARM64 instruction preset" },
    Object.entries(DOCUMENTED_WORDS).map(([k, word]) =>
      el("option", { value: `0x${word.toString(16).toUpperCase().padStart(8, "0")}` }, [
        `${k} (0x${word.toString(16).toUpperCase().padStart(8, "0")})`,
      ]),
    ),
  );
  const a64Input = el("input", {
    type: "text",
    value: "0xD503201F",
    "aria-label": "Custom 32-bit A64 hex word",
    class: "hex-field",
  });
  const a64Bits = el("div", { class: "bit-row" });
  const a64Out = el("div");

  function renderA64(hexStr) {
    const clean = hexStr.trim().replace(/^0x/i, "");
    const word = parseInt(clean, 16) >>> 0;
    const decoded = decodeA64(word);
    a64Bits.replaceChildren(
      ...Array.from({ length: 32 }, (_, idx) => {
        const bit = (word >>> (31 - idx)) & 1;
        return el("div", { class: `bit-cell${bit ? " one" : ""}`, title: `bit ${31 - idx}` }, [String(bit)]);
      }),
    );
    a64Out.replaceChildren(
      kv("Word [31:0]", `0x${word.toString(16).toUpperCase().padStart(8, "0")}`),
      kv("Decoded A64", decoded ? `${decoded.mnemonic} — ${decoded.detail}` : "Undocumented / non-matching word"),
    );
  }
  a64Select.addEventListener("change", () => {
    a64Input.value = a64Select.value;
    renderA64(a64Input.value);
  });
  a64Input.addEventListener("input", () => renderA64(a64Input.value));
  renderA64(a64Input.value);

  const rerunBtn = el("button", { type: "button", class: "primary" }, ["Re-run Pointer Chase"]);

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["28.75 mm² · ARMv9.3-A"]),
      el("span", {}, ["1× C1-ULTRA 4.21 GHz · 3× C1-PREMIUM 3.50 GHz · 4× C1-PRO 2.70 GHz"]),
    ]),
    el("h1", {}, ["CPU — Arm C1 All-Big-Core Cluster & Live Benchmarks"]),
    el("p", { class: "lede" }, [
      "Explore all 15 architectural taxonomy layers in 3D, run a live Sattolo pointer-chase memory latency sweep across 16 KB – 16 MB, benchmark WASM SIMD f32x4 vs scalar throughput, and decode ARMv9.3-A 32-bit instruction words.",
    ]),
    readoutGrid([
      readout("C1-Ultra Front-End", "10w / 23p", "MOP/issue", { tone: "accent", sub: "~2K in-flight · 3.259 mm²" }),
      readout("C1-Ultra L1 Cache", "64 / 128", "KB I/D", { tone: "cyan", sub: "2× L1D vs X925 (Arm TRM)" }),
      readout("Shared L3 / SLC", "16 / 10", "MB", { tone: "ok", sub: "2 MB / 1 MB / 512 KB L2" }),
      readout("SVE2 / SME2 VL", "128 / 512", "bits", { tone: "cyan", sub: "Shared 2.91 mm² SME2 unit" }),
    ]),
    explore.node,
    el("div", { class: "tool-bar" }, [rerunBtn, coiBtn, status]),
    el("div", { class: "grid cols-2" }, [
      panel(
        "Live Pointer-Chase Latency Curve (This Device)",
        [chasePlotHost, chaseListHost],
        null,
        "MEASURED · Sattolo Cycle",
      ),
      panel(
        "WASM SIMD f32x4 vs Scalar & Arm C1 Manuals",
        [
          simdHost,
          kv(
            "C1-Ultra L1",
            el("span", {}, [
              `I ${specs.soc.l1i_kb_c1_ultra.value} KB / D ${specs.soc.l1d_kb_c1_ultra.value} KB `,
              provCited(specs.soc.l1i_kb_c1_ultra),
            ]),
          ),
          kv(
            "C1-Premium L1",
            el("span", {}, [
              `I ${specs.soc.l1i_kb_c1_premium.value} KB / D ${specs.soc.l1d_kb_c1_premium.value} KB `,
              provCited(specs.soc.l1d_kb_c1_premium),
            ]),
          ),
          kv(
            "C1-Pro L1",
            el("span", {}, [
              `I ${specs.soc.l1i_kb_c1_pro.value} KB / D ${specs.soc.l1d_kb_c1_pro.value} KB `,
              provCited(specs.soc.l1i_kb_c1_pro),
            ]),
          ),
          kv(
            "C1-Ultra TLB",
            el("span", {}, [String(specs.soc.c1_ultra_tlb.value), " ", provCited(specs.soc.c1_ultra_tlb)]),
          ),
        ],
        null,
        "SIMD + Arm TRM",
      ),
    ]),
    panel(
      "ARMv9.3-A 32-Bit Instruction Bitfield Inspector",
      [el("div", { class: "chips" }, [a64Select, a64Input]), a64Bits, a64Out],
      null,
      "ISA Level · Documented A64 Encodings",
    ),
  );

  const marks = referenceMarks(specs);
  const sketch = await mountSketch(chasePlotHost, drawChaseChart, { height: 240 });

  async function runBench() {
    rerunBtn.disabled = true;
    const points = [];
    for (const bytes of SIZES) {
      const built = buildChase(bytes);
      const timed = timeChase(built, { minElapsedMs: 22 });
      points.push({ bytes, nsPerLoad: timed.nsPerLoad });
      status.textContent = `Chase ${fmtBytes(bytes)} · ${fmt(timed.nsPerLoad, 3)} ns/load`;
      sketch.setState({ points, marks });
      await new Promise((r) => setTimeout(r, 0));
    }
    const jumps = chaseJumps(points);
    explore.setMeasured(points);
    chaseListHost.replaceChildren(
      ...points.map((pt) =>
        kv(
          fmtBytes(pt.bytes),
          el("span", {}, [`${fmt(pt.nsPerLoad, 3)} ns/load `, provMeasured("dependent pointer chase")]),
        ),
      ),
      note(
        jumps.length
          ? `Step knees detected at ${jumps.map((j) => fmtBytes(j.bytes)).join(", ")}. Vertical markers show Dimensity 9500 cited L1/L2/L3/SLC capacities for scale.`
          : "Smooth sweep across working sets in this browser run.",
      ),
    );

    // Live WASM SIMD f32x4 vs scalar benchmark
    try {
      const k = await loadKernels();
      const iters = 8_000_000;
      const t0 = performance.now();
      const sSink = k.scalar_f32_adds(iters);
      const t1 = performance.now();
      const vSink = k.simd_f32x4_adds(iters);
      const t2 = performance.now();
      const scalarGops = (iters * 4) / ((t1 - t0) * 1e6);
      const simdGops = (iters * 4) / ((t2 - t1) * 1e6);
      simdHost.replaceChildren(
        kv(
          "WASM SIMD f32x4",
          el("span", {}, [`${fmt(simdGops, 3)} Gops/s `, provMeasured(`sink ${vSink.toFixed(2)}`)]),
        ),
        kv(
          "WASM Scalar f32",
          el("span", {}, [`${fmt(scalarGops, 3)} Gops/s `, provMeasured(`sink ${sSink.toFixed(2)}`)]),
        ),
        kv(
          "SIMD Speedup",
          el("span", {}, [`${fmt(simdGops / Math.max(1e-6, scalarGops), 3)}× `, provComputed("f32x4 / scalar")]),
        ),
      );
    } catch (err) {
      simdHost.replaceChildren(note(`WASM SIMD check skipped: ${err.message}`));
    }
    rerunBtn.disabled = false;
  }

  rerunBtn.addEventListener("click", runBench);
  await runBench();

  return {
    dispose() {
      sketch.dispose();
      explore.dispose();
    },
  };
}

function drawChaseChart(p, state) {
  p.background("#06080c");
  const pts = state.points || [];
  const marks = state.marks || [];
  const padL = 52;
  const padR = 18;
  const padT = 22;
  const padB = 34;
  const w = p.width - padL - padR;
  const h = p.height - padT - padB;

  const logMin = Math.log2(16 * 1024);
  const logMax = Math.log2(32 * 1024 * 1024);
  const maxNs = Math.max(20, ...pts.map((pt) => pt.nsPerLoad * 1.18));

  const xOf = (b) => padL + ((Math.log2(b) - logMin) / (logMax - logMin)) * w;
  const yOf = (ns) => padT + h - (ns / maxNs) * h;

  // Grid lines
  p.stroke("#1a2434");
  p.strokeWeight(1);
  for (let i = 0; i <= 4; i++) {
    const gy = padT + (i / 4) * h;
    p.line(padL, gy, padL + w, gy);
    p.noStroke();
    p.fill("#6f819c");
    p.textSize(10);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(`${((1 - i / 4) * maxNs).toFixed(0)} ns`, padL - 6, gy);
    p.stroke("#1a2434");
  }

  // Dimensity 9500 cited cache capacity reference markers
  for (const m of marks) {
    if (m.bytes < 16 * 1024 || m.bytes > 32 * 1024 * 1024) continue;
    const mx = xOf(m.bytes);
    p.stroke("rgba(56, 212, 242, 0.35)");
    p.line(mx, padT, mx, padT + h);
    p.noStroke();
    p.fill("#38d4f2");
    p.textSize(9);
    p.textAlign(p.CENTER, p.TOP);
    p.text(m.label.split(" ")[0], mx, padT + 2);
  }

  // Measured curve
  if (pts.length > 0) {
    p.stroke("#ff6900");
    p.strokeWeight(2.5);
    p.noFill();
    p.beginShape();
    for (const pt of pts) p.vertex(xOf(pt.bytes), yOf(pt.nsPerLoad));
    p.endShape();
    for (const pt of pts) {
      const px = xOf(pt.bytes);
      const py = yOf(pt.nsPerLoad);
      p.fill("#ff6900");
      p.noStroke();
      p.circle(px, py, 7);
      p.fill("#eef3fa");
      p.textSize(10);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(`${pt.nsPerLoad.toFixed(1)}`, px, py - 6);
    }
  }

  // X-axis tick labels
  p.noStroke();
  p.fill("#9fb0c8");
  p.textSize(10);
  p.textAlign(p.CENTER, p.TOP);
  for (const [b, lbl] of [
    [16 * 1024, "16K"],
    [64 * 1024, "64K"],
    [256 * 1024, "256K"],
    [1024 * 1024, "1M"],
    [4 * 1024 * 1024, "4M"],
    [16 * 1024 * 1024, "16M"],
  ]) {
    p.text(lbl, xOf(b), padT + h + 8);
  }
}
