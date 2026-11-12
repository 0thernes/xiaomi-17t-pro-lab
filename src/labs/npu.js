import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed } from "../provenance.js";
import { fillUnit, matmulFp, matmulQuantized, mulberry32, quantizeSymmetricInt8, rmse } from "../sim/quant.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { getSpecs, npuCounts } from "../specs.js";
import { buildMac, makeMaterials, mountView } from "../graphics/view.js";

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const counts = npuCounts();
  const levels = engineLevels(taxonomy, "npu");
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": "MAC array computing a quantized product in JavaScript" });
  stage.append(canvas);
  const rail = el("div", { class: "level-rail" });
  const sheet = el("div");
  const n = 8;
  const rng = mulberry32(9);
  const A = fillUnit(n * n, rng);
  const B = fillUnit(n * n, rng);
  const fp = matmulFp(A, B, n);
  const aq = quantizeSymmetricInt8(A);
  const bq = quantizeSymmetricInt8(B);
  const q = matmulQuantized(aq.q, aq.scale, bq.q, bq.scale, n);
  const error = rmse(fp, q);

  let view = null;
  try {
    view = await mountView(canvas, cap);
    const materials = makeMaterials(cap.tier);
    view.root.add(buildMac(materials, n));
    view.look(14);
    let tick = 0;
    view.setFrame(() => {
      tick += 1;
      if (tick % 20 !== 0) return;
      const cell = view.root.getObjectByName(`mac-${tick % n}-${Math.floor(tick / n) % n}`);
      if (cell?.material?.emissive) cell.material.emissive.setHex(tick % 2 ? 0xff7a1a : 0x221408);
    });
  } catch (err) {
    stage.append(note(err.message));
  }

  for (const level of levels) {
    const button = el("button", { type: "button" }, [level.name.slice(0, 32)]);
    button.addEventListener("click", () => {
      for (const item of rail.querySelectorAll("button"))
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      sheet.replaceChildren(panel(level.name, [el("p", {}, [level.facets.structure.text])]));
    });
    rail.append(button);
  }

  main.replaceChildren(
    el("h1", {}, ["NPU"]),
    el("p", { class: "lede warn" }, [
      "These products run in JavaScript and WASM on the CPU thread this browser scheduled. They do not run on the MediaTek NPU 990 or the CIM Super Efficient NPU. A web page cannot dispatch to that accelerator.",
    ]),
    stage,
    rail,
    sheet,
    panel("What was published", [
      kv("Structure", el("span", {}, [`${counts.mdla} MDLA + ${counts.mvpu} MVPU `, provCited(counts.entry)])),
      kv(
        "Area",
        el("span", {}, [
          `${specs.soc.die_block_npu990_mm2.value} ${specs.soc.die_block_npu990_mm2.unit} `,
          provCited(specs.soc.die_block_npu990_mm2),
        ]),
      ),
      kv(
        "TOPS",
        el("span", {}, [`${specs.soc.npu_tops.value} ${specs.soc.npu_tops.unit} `, provCited(specs.soc.npu_tops)]),
      ),
      kv("INT8 RMSE", el("span", {}, [`${fmt(error, 4)} `, provComputed("symmetric int8 matmul versus FP64, n=8")])),
      note(
        "100 TOPS is published and unconfirmed. The precision is not stated. The MAC grid above is this page’s integer product, not the NPU’s array.",
      ),
    ]),
  );
  return {
    dispose() {
      view?.dispose();
    },
  };
}
