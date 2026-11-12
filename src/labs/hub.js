import specs from "../../data/specs.json" with { type: "json" };
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import {
  colorsForBitsPerChannel,
  computedPpi,
  gpuFp32Gflops,
  pixelRate,
  siliconNearestNeighbor,
  ultraToProPowerRatio,
} from "../sim/device-math.js";
import { CLUSTER } from "../sim/constants.js";
import { mountHero } from "../viz/hero.js";

export async function mount(main, { cap }) {
  const device = specs.device;
  const [heightPx, widthPx] = device.display_resolution_px.value;
  const ppi = computedPpi(widthPx, heightPx, device.display_diagonal_in.value);
  const rate = pixelRate(widthPx, heightPx, device.display_refresh_hz_max.value);
  const colors12 = colorsForBitsPerChannel(device.color_depth.value);
  const colors8 = colorsForBitsPerChannel(8);
  const ratio = ultraToProPowerRatio();

  const stage = el("div", { class: "hero-stage" });
  const canvas = el("canvas", { "aria-label": "Three.js model of the Xiaomi 17T Pro at its cited body size" });
  stage.append(canvas);
  const caption = el("div", { class: "hero-caption" });
  stage.append(caption);

  const frameReadout = el("span", {}, ["—"]);
  let hero = null;
  let timer = 0;
  try {
    hero = mountHero(canvas, cap);
    const colors = el("div", { class: "color-row" });
    for (const name of device.colors_official.value) {
      const button = el("button", { type: "button", class: "swatch" }, [name]);
      button.addEventListener("click", () => hero.setFinish(name));
      colors.append(button);
    }
    caption.append(colors);
    timer = window.setInterval(() => {
      if (hero.frameMs != null) frameReadout.textContent = `${hero.frameMs.toFixed(1)} ms`;
    }, 250);
  } catch (error) {
    stage.append(
      note(`WebGL hero unavailable (${error.message}). The figures below are still computed from the cited body.`),
    );
  }

  const tierWhy = [
    `tier ${cap.tier}`,
    cap.benchMs == null ? "no WebGL probe" : `fill probe ${cap.benchMs.toFixed(1)} ms`,
    cap.memoryGb == null ? "deviceMemory hidden" : `${cap.memoryGb} GB deviceMemory`,
    cap.cores == null ? "hardwareConcurrency hidden" : `${cap.cores} logical cores`,
    cap.coarse ? "coarse pointer" : "fine pointer",
    cap.reducedMotion ? "reduced motion" : "motion allowed",
  ].join(" · ");

  main.replaceChildren(
    el("h1", {}, ["The phone, then the silicon"]),
    el("p", { class: "lede" }, [
      "Xiaomi 17T Pro, Dimensity 9500, TSMC N3P FinFET. This page renders the body and computes the display numbers from the cited specification. Nothing below is a guessed transistor count or a guessed GPU clock.",
    ]),
    stage,
    el("div", { class: "grid cols-2" }, [
      panel("This browser", [
        kv(
          "Quality tier",
          el("span", {}, [
            cap.tier,
            " ",
            provMeasured("fill probe, memory, cores, GPU name. Orientation is not an input."),
          ]),
        ),
        kv("GPU", el("span", {}, [cap.renderer, " ", provMeasured("WEBGL_debug_renderer_info")])),
        kv(
          "Frame time",
          el("span", {}, [frameReadout, " ", provMeasured("requestAnimationFrame, includes the phone scene")]),
        ),
        kv(
          "WebGPU",
          el("span", {}, [
            cap.webgpu ? "navigator.gpu present" : "navigator.gpu absent",
            " ",
            provMeasured("feature detect"),
          ]),
        ),
        note(tierWhy),
      ]),
      panel("Display arithmetic", [
        kv(
          "Cited PPI",
          el("span", {}, [`${device.display_ppi.value} ${device.display_ppi.unit} `, provCited(device.display_ppi)]),
        ),
        kv(
          "PPI from pixels and diagonal",
          el("span", {}, [
            `${fmt(ppi, 5)} PPI `,
            provComputed(`hypot(${widthPx}, ${heightPx}) / ${device.display_diagonal_in.value}`),
          ]),
        ),
        kv(
          "Pixels per second at max refresh",
          el("span", {}, [
            `${fmt(rate, 4)} px/s `,
            provComputed(`${widthPx} × ${heightPx} × ${device.display_refresh_hz_max.value}`),
          ]),
        ),
        kv(
          "12-bit color count",
          el("span", {}, [
            `${fmt(colors12, 4)} `,
            provComputed("2^(12×3). The FAQ’s 8-bit claim cannot reach 68 billion."),
          ]),
        ),
        kv("8-bit color count", el("span", {}, [`${fmt(colors8, 4)} `, provComputed("2^(8×3) = 16,777,216")])),
        note(
          `Conflict in the dossier: spec page ${device.color_depth.value}-bit versus the FAQ’s 8-bit wording. ${fmt(colors8, 3)} colors is not 68 billion.`,
        ),
      ]),
      panel("Cluster, without invented widths", [
        kv("CPU", el("span", {}, [specs.soc.cpu_cluster.value, " ", provCited(specs.soc.cpu_cluster)])),
        kv("L1", el("span", {}, ["UNKNOWN ", provCited(specs.soc.l1_cache_bytes)])),
        kv(
          "L3 / SLC",
          el("span", {}, [
            `${specs.soc.l3_mb.value} MB L3, ${specs.soc.slc_mb.value} MB SLC `,
            provCited(specs.soc.l3_mb),
          ]),
        ),
        kv(
          "P(Ultra) / P(Pro) at the same αCV²",
          el("span", {}, [
            `${fmt(ratio, 4)} `,
            provComputed(`${CLUSTER[0].ghz} / ${CLUSTER[2].ghz}. α, C, and V cancel.`),
          ]),
        ),
        kv(
          "GPU clock and peak GFLOPS",
          el("span", {}, [gpuFp32Gflops(null) == null ? "UNKNOWN " : "", provCited(specs.soc.gpu_clock_mhz)]),
        ),
        note("12 × 256 × f FP32 ops/s, FMA counted as 2. f is unpublished, so the product stays unknown."),
      ]),
      panel("One lattice constant", [
        kv(
          "Si nearest neighbor",
          el("span", {}, [
            `${fmt(siliconNearestNeighbor() * 1e9, 5)} nm `,
            provComputed("a√3/4 from the NIST lattice parameter"),
          ]),
        ),
        kv("NPU TOPS", el("span", {}, ["UNKNOWN ", provCited(specs.soc.npu_tops)])),
        kv("Transistor count", el("span", {}, ["UNKNOWN ", provCited(specs.soc.transistor_count)])),
        note("N3P is FinFET. Nanosheet GAA is TSMC N2, shown only as a contrast in the transistor lab."),
      ]),
    ]),
  );

  return {
    dispose() {
      clearInterval(timer);
      hero?.dispose();
    },
  };
}
