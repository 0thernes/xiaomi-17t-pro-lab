import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { computedPpi, pixelRate, ultraToProPowerRatio } from "../sim/device-math.js";
import { getSpecs, openItems, parseDieMm, parsePackageMm } from "../specs.js";
import { applyMetalPlate, buildPhone, makeMaterials, mountView } from "../graphics/view.js";

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const device = specs.device;
  const [heightPx, widthPx] = device.display_resolution_px.value;
  const ppi = computedPpi(widthPx, heightPx, device.display_diagonal_in.value);
  const rate = pixelRate(widthPx, heightPx, device.display_refresh_hz_max.value);
  const die = parseDieMm(specs);
  const pkg = parsePackageMm(specs);
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", {
    "aria-label": "Exploded model of the Xiaomi 17T Pro. Outer size is cited. Internals are a reconstruction.",
  });
  const caption = el("div", { class: "stage-caption" });
  stage.append(canvas, caption);
  const frameReadout = el("span", {}, ["—"]);
  caption.append(
    el("p", {}, [
      "Cited body ",
      `${device.height_mm.value} × ${device.width_mm.value} × ${device.thickness_mm.value} mm`,
    ]),
  );
  caption.append(el("p", {}, ["Frame ", frameReadout]));

  let view = null;
  const materials = makeMaterials(cap.tier);
  try {
    view = await mountView(canvas, cap);
    view.root.add(buildPhone(materials, 0.45));
    view.look(420);
    applyMetalPlate(materials).catch(() => {});
  } catch (error) {
    stage.append(note(`WebGL unavailable (${error.message}). The numbers below still come from specs.json.`));
  }

  const explode = el("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.01",
    value: "0.45",
    "aria-label": "Explode the phone",
  });
  explode.addEventListener("input", () => {
    if (!view) return;
    view.clear();
    view.root.add(buildPhone(materials, Number(explode.value)));
  });
  const timer = window.setInterval(() => {
    if (view) frameReadout.textContent = `${view.frameMs.toFixed(1)} ms`;
  }, 250);

  const tierWhy = [
    `tier ${cap.tier}`,
    cap.benchMs == null ? "no WebGL probe" : `fill probe ${cap.benchMs.toFixed(1)} ms`,
    cap.memoryGb == null ? "deviceMemory hidden" : `${cap.memoryGb} GB deviceMemory`,
    cap.cores == null ? "hardwareConcurrency hidden" : `${cap.cores} logical cores`,
    cap.coarse ? "coarse pointer" : "fine pointer",
  ].join(" · ");

  main.replaceChildren(
    el("p", { class: "display" }, ["17T Pro"]),
    el("h1", {}, ["From the glass to the lattice"]),
    el("p", { class: "lede" }, [
      "Flagship launch lab for the Xiaomi 17T Pro and Dimensity 9500. The body size is cited. The teardown follows the repair manual’s named stack. Die areas are Kurnal’s, arranged here as a reconstruction. Reference photographs are not included.",
    ]),
    stage,
    el("label", { class: "slider" }, ["Pull the stack apart", explode]),
    el("div", { class: "grid cols-2" }, [
      panel("This browser", [
        kv(
          "Quality",
          el("span", {}, [tierWhy, " ", provMeasured("fill probe, memory, cores, GPU string. Not orientation.")]),
        ),
        kv("Frame", el("span", {}, [frameReadout, " ", provMeasured("requestAnimationFrame interval")])),
      ]),
      panel("Display", [
        kv(
          "Diagonal",
          el("span", {}, [`${device.display_diagonal_in.value} in `, provCited(device.display_diagonal_in)]),
        ),
        kv("PPI", el("span", {}, [`${fmt(ppi, 4)} `, provComputed("hypot(2772, 1280) / 6.83")])),
        kv("Pixel rate", el("span", {}, [`${fmt(rate, 4)} px/s `, provComputed("2772 × 1280 × 144")])),
        kv("USB", el("span", {}, [String(device.phone_usb_data.value), " ", provCited(device.phone_usb_data)])),
        kv("Fingerprint", el("span", {}, [String(device.fingerprint.value), " ", provCited(device.fingerprint)])),
        kv(
          "Anode",
          el("span", {}, [
            `${device.battery_si_c_ratio.value}${device.battery_si_c_ratio.unit ? " " + device.battery_si_c_ratio.unit : ""} silicon, ${device.battery_construction.value}`,
            " ",
            provCited(device.battery_si_c_ratio),
          ]),
        ),
      ]),
      panel("Silicon", [
        kv(
          "Die",
          el("span", {}, [
            die ? `${die.widthMm} × ${die.heightMm} mm, ${die.areaMm2} mm² ` : "UNKNOWN ",
            provCited(specs.soc.die_size_mm2),
          ]),
        ),
        kv(
          "Package",
          el("span", {}, [
            pkg ? `${pkg.widthMm} × ${pkg.heightMm} mm ` : "UNKNOWN ",
            provCited(specs.soc.package_this_phone),
          ]),
        ),
        kv(
          "GPU clock",
          el("span", {}, [
            `${specs.soc.gpu_clock_mhz.value} ${specs.soc.gpu_clock_mhz.unit} `,
            provCited(specs.soc.gpu_clock_mhz),
          ]),
        ),
        kv(
          "NPU TOPS",
          el("span", {}, [`${specs.soc.npu_tops.value} ${specs.soc.npu_tops.unit} `, provCited(specs.soc.npu_tops)]),
        ),
        kv(
          "Clock ratio",
          el("span", {}, [`${fmt(ultraToProPowerRatio(), 4)} `, provComputed("4.21 / 2.7, α C V² cancel")]),
        ),
      ]),
      panel("Still open", [
        note(`${openItems().length} leaves are still unknown or unconfirmed. The Specs page lists each reason.`),
      ]),
    ]),
  );

  return {
    dispose() {
      window.clearInterval(timer);
      view?.dispose();
    },
  };
}
