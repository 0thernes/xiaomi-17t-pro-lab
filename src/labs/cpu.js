import specs from "../../data/specs.json" with { type: "json" };
import { CLUSTER, L3_BYTES, SLC_BYTES } from "../sim/constants.js";
import { buildChase, largestStep, timeChase } from "../sim/chase.js";
import { gibPerSecond, streamBytes, triadKernel } from "../sim/stream.js";
import { probeTimer } from "../sim/timing.js";
import { quantizationUncertaintyPerStep, summarize } from "../sim/stats.js";
import { DOCUMENTED_WORDS, decodeA64, toBitString, toHex } from "../sim/a64.js";
import { cmosDynamicPower, ultraToProPowerRatio } from "../sim/device-math.js";
import { loadKernels } from "../sim/wasm.js";
import { el, kv, note, panel } from "../dom.js";
import { fmt, fmtBytes } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { enableCrossOriginIsolation } from "../isolation.js";
import { mountSketch } from "../p5-loader.js";

const AUTO_SIZES = [32 * 1024, 256 * 1024, 1024 * 1024, 4 * 1024 * 1024, 16 * 1024 * 1024, 32 * 1024 * 1024];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mount(main, { cap } = { cap: {} }) {
  const timer = probeTimer();
  const status = el("p", { class: "status", role: "status" }, ["Running a short chase, a triad, and a SIMD loop…"]);
  const chaseHost = el("div");
  const streamHost = el("div");
  const simdHost = el("div");
  const plotHost = el("div", { class: "plot" });
  const decodeHost = el("div");
  const markers = [
    { bytes: CLUSTER[2].l2Bytes, label: "L2 Pro 512 KB" },
    { bytes: CLUSTER[1].l2Bytes, label: "L2 Premium 1 MB" },
    { bytes: CLUSTER[0].l2Bytes, label: "L2 Ultra 2 MB" },
    { bytes: SLC_BYTES, label: "SLC 10 MB" },
    { bytes: L3_BYTES, label: "L3 16 MB" },
  ];

  main.replaceChildren(
    el("h1", {}, ["CPU, measured here"]),
    el("p", { class: "lede" }, [
      "Pointer chase, a STREAM triad, and WASM SIMD run in this browser. Knees can be consistent with the official L2, L3, and SLC sizes. They are not cycle-accurate hit latencies, and L1 size is unpublished.",
    ]),
    panel("Timer", [
      kv("Cross-origin isolated", timer.isolated ? "yes" : "no"),
      kv(
        "Smallest positive performance.now delta",
        el("span", {}, [`${fmt(timer.minDeltaMs, 4)} ms `, provMeasured("tight loop")]),
      ),
      kv(
        "Chrome timer class for this isolation state",
        el("span", {}, [
          `${timer.citedClassUs} µs `,
          provCited(
            specs.browser[timer.isolated ? "timer_resolution_isolated_us" : "timer_resolution_non_isolated_us"],
          ),
        ]),
      ),
      el("button", { type: "button", onClick: () => void enableCrossOriginIsolation() }, ["Tighten timers"]),
      note(
        "The button registers coi-serviceworker.js and reloads once. The local server already sends COOP and COEP, so it may already say isolated. A 100 µs class smears L1 against L2. Uncertainty is printed on every chase point.",
      ),
    ]),
    status,
    panel("Pointer chase", [chaseHost, plotHost]),
    panel("STREAM triad", [streamHost]),
    panel("WASM SIMD, not SME2", [simdHost]),
    panel("Documented A64 words", [decodeHost, a64Form(decodeHost)]),
    panel("Dynamic power, symbols left open", [
      kv(
        "P(Ultra) / P(Pro)",
        el("span", {}, [`${fmt(ultraToProPowerRatio(), 4)} `, provComputed("4.21 / 2.7 at the same α, C, V")]),
      ),
      kv(
        "P = α C V² f",
        el("span", {}, [
          cmosDynamicPower({ alpha: null, capacitance: null, voltage: null, freqHz: CLUSTER[0].ghz * 1e9 }).power ==
          null
            ? "UNKNOWN "
            : "",
          provComputed("α, C, and V are unpublished"),
        ]),
      ),
      note(
        `Official caps: ${CLUSTER.map((core) => `${core.count}× ${core.name} ${core.ghz} GHz`).join(", ")}. ${provText(specs.soc.cpu_cluster)}`,
      ),
    ]),
  );

  const sketch = await mountSketch(plotHost, drawChase);
  const points = [];
  const sizes =
    cap?.memoryGb != null && cap.memoryGb <= 4 ? AUTO_SIZES.filter((bytes) => bytes <= 8 * 1024 * 1024) : AUTO_SIZES;
  for (const bytes of sizes) {
    await sleep(0);
    try {
      const samples = [];
      let steps = 0;
      for (let trial = 0; trial < 2; trial++) {
        const built = buildChase(bytes);
        const timed = timeChase(built, { minElapsedMs: 24 });
        samples.push(timed.nsPerLoad);
        steps = timed.steps;
      }
      const stats = summarize(samples);
      const uncertainty = quantizationUncertaintyPerStep(timer.minDeltaMs, steps) * 1e6;
      points.push({ bytes, nsPerLoad: stats.median, uncertaintyNs: uncertainty, steps });
      status.textContent = `Chase ${fmtBytes(bytes)} · ${fmt(stats.median, 3)} ns/load`;
      sketch.setState({ points, markers });
    } catch (error) {
      points.push({ bytes, nsPerLoad: null, error: error.message });
    }
  }
  const step = largestStep(points.filter((point) => point.nsPerLoad));
  chaseHost.append(
    ...points.map((point) =>
      kv(
        fmtBytes(point.bytes),
        point.nsPerLoad == null
          ? "UNKNOWN"
          : el("span", {}, [
              `${fmt(point.nsPerLoad, 3)} ± ${fmt(point.uncertaintyNs, 3)} ns/load `,
              provMeasured(`${point.steps} dependent loads, median of 2`),
            ]),
      ),
    ),
    note(
      step
        ? `Largest step is ×${fmt(step.jump, 3)} between ${fmtBytes(step.from.bytes)} and ${fmtBytes(step.to.bytes)}. That is consistent with leaving a cache. It is not “L3 latency = N cycles.” L1 size is UNKNOWN. SLC is 10 MB and smaller than the 16 MB L3, so a CPU chase often has no separate SLC shelf.`
        : "No step resolved.",
    ),
    note("Lines on the chart are cited capacities, not fitted latencies."),
  );

  const stream = await runTriad(250000);
  streamHost.append(
    kv(
      "Triad bandwidth",
      el("span", {}, [`${fmt(stream.bestGBps, 3)} GB/s best `, provMeasured("a[i] = b[i] + scalar·c[i], Float64")]),
    ),
    kv(
      "Median of the trials",
      el("span", {}, [`${fmt(stream.medianGBps, 3)} GB/s `, provMeasured(`${stream.trials} trials`)]),
    ),
    kv(
      "Bytes moved per trial",
      el("span", {}, [`${fmt(stream.bytes / 1e6, 4)} MB `, provComputed("3 arrays × n × 8")]),
    ),
    kv(
      "Phone DRAM theoretical bandwidth",
      el("span", {}, ["UNKNOWN ", provCited(specs.soc.memory_theoretical_bandwidth_GBps)]),
    ),
    note(
      "This is typed-array bandwidth in the browser. Channel width is unpublished, so a 64-bit 76.8 GB/s illustration is not shown as a result. The working set may still sit in a large desktop cache.",
    ),
  );

  const simd = await runSimd();
  simdHost.append(
    kv(
      "SIMD f32×4 adds",
      el("span", {}, [`${fmt(simd.simdGops, 3)} Gops/s `, provMeasured("wasm f32x4.add, 4 ops per iteration")]),
    ),
    kv("Scalar f32 adds", el("span", {}, [`${fmt(simd.scalarGops, 3)} Gops/s `, provMeasured("wasm f32.add × 4")])),
    kv("SIMD / scalar", el("span", {}, [`${fmt(simd.ratio, 3)} `, provComputed("simd Gops / scalar Gops")])),
    note(
      "Software ceiling on whatever core the browser thread landed on. Not SME2, not SVE, not a core-type split. The sink values are kept so the loops stay live.",
    ),
  );
  status.textContent = "Short run finished. Numbers above are from this page load.";

  return { dispose: () => sketch.dispose() };
}

function provText(entry) {
  return entry.source || "";
}

async function runTriad(n) {
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  const c = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    b[i] = (i % 97) * 0.01;
    c[i] = (i % 53) * 0.02;
  }
  triadKernel(a, b, c, 1.5);
  const rates = [];
  const bytes = streamBytes(n, 8).triad;
  for (let trial = 0; trial < 3; trial++) {
    const t0 = performance.now();
    triadKernel(a, b, c, 1.5);
    const ms = performance.now() - t0;
    rates.push(gibPerSecond(bytes, ms));
    await sleep(0);
  }
  const stats = summarize(rates);
  return { bestGBps: Math.max(...rates), medianGBps: stats.median, trials: rates.length, bytes, sink: a[n - 1] };
}

async function runSimd() {
  const kernels = await loadKernels();
  const iters = 1500000;
  const simd = timeKernel(() => kernels.simd_f32x4_adds(iters));
  const scalar = timeKernel(() => kernels.scalar_f32_adds(iters));
  const simdGops = (iters * 4) / (simd.ms / 1000) / 1e9;
  const scalarGops = (iters * 4) / (scalar.ms / 1000) / 1e9;
  return {
    simdGops,
    scalarGops,
    ratio: scalarGops ? simdGops / scalarGops : null,
    simdSink: simd.sink,
    scalarSink: scalar.sink,
  };
}

function timeKernel(fn) {
  fn();
  const t0 = performance.now();
  const sink = fn();
  return { ms: Math.max(performance.now() - t0, 1e-6), sink };
}

function a64Form() {
  const select = el("select", { "aria-label": "Documented A64 encoding" });
  const options = [
    ["NOP", DOCUMENTED_WORDS.NOP],
    ["RET", DOCUMENTED_WORDS.RET_X30],
    ["SVC #0", DOCUMENTED_WORDS.SVC_0],
    ["ADD X0, X1, X2", DOCUMENTED_WORDS.ADD_X0_X1_X2],
  ];
  for (const [label, word] of options) {
    select.append(el("option", { value: toHex(word) }, [`${label} ${toHex(word)}`]));
  }
  const custom = el("input", { type: "text", value: "8B020020", "aria-label": "Hex word", spellcheck: "false" });
  const out = el("div");
  function render(hexText) {
    const word = Number.parseInt(hexText.replace(/^0x/i, ""), 16);
    out.replaceChildren();
    if (!Number.isInteger(word) || word < 0 || word > 0xffffffff) {
      out.append(note("Enter eight hex digits."));
      return;
    }
    const decoded = decodeA64(word);
    out.append(
      kv("Bits", el("span", { class: "mono" }, [toBitString(word >>> 0)])),
      kv("Decoder", decoded ? decoded.mnemonic : "not in the documented set"),
    );
    if (decoded) {
      for (const field of decoded.fields) out.append(kv(`${field.name} [${field.bits}]`, String(field.value)));
      out.append(
        note(decoded.detail + ". Encodings from the Arm ARM via the research dossier. This is not Xiaomi firmware."),
      );
    }
  }
  select.addEventListener("change", () => {
    custom.value = select.value.slice(2);
    render(select.value);
  });
  custom.addEventListener("change", () => render(custom.value));
  render(select.value || "D503201F");
  return el("div", {}, [select, custom, out]);
}

function drawChase(p, state) {
  p.background("#1c1e18");
  const points = state.points || [];
  if (!points.length) {
    p.fill("#c8c2b4");
    p.text("Waiting for chase samples", 16, 28);
    return;
  }
  const left = 48;
  const right = p.width - 12;
  const top = 16;
  const bottom = p.height - 32;
  const xs = points.map((point) => point.bytes);
  const ys = points.map((point) => point.nsPerLoad).filter((value) => value > 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, minY * 1.2);
  const xOf = (bytes) =>
    left + ((Math.log(bytes) - Math.log(minX)) / (Math.log(maxX) - Math.log(minX) || 1)) * (right - left);
  const yOf = (ns) => bottom - ((ns - minY) / (maxY - minY || 1)) * (bottom - top);
  p.stroke("#3a3d32");
  p.line(left, top, left, bottom);
  p.line(left, bottom, right, bottom);
  for (const marker of state.markers || []) {
    if (marker.bytes < minX || marker.bytes > maxX) continue;
    const x = xOf(marker.bytes);
    p.stroke("#8ec8d8");
    p.line(x, top, x, bottom);
  }
  p.noFill();
  p.stroke("#e08a4f");
  p.strokeWeight(2);
  p.beginShape();
  for (const point of points) {
    if (!(point.nsPerLoad > 0)) continue;
    p.vertex(xOf(point.bytes), yOf(point.nsPerLoad));
  }
  p.endShape();
  p.noStroke();
  p.fill("#f4f0e6");
  p.textSize(11);
  p.text("ns/load", 8, 14);
  p.text("working set", left, p.height - 10);
}
