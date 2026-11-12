import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed } from "../provenance.js";
import { fillUnit, matmulFp, matmulQuantized, mulberry32, quantizeSymmetricInt8, rmse } from "../sim/quant.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { getSpecs, npuCounts } from "../specs.js";
import { mountExplore } from "./explore.js";

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const counts = npuCounts();
  const levels = engineLevels(taxonomy, "npu");
  const n = 8;
  const rng = mulberry32(9);
  const A = fillUnit(n * n, rng);
  const B = fillUnit(n * n, rng);
  const fp = matmulFp(A, B, n);
  const aq = quantizeSymmetricInt8(A);
  const bq = quantizeSymmetricInt8(B);
  const q = matmulQuantized(aq.q, aq.scale, bq.q, bq.scale, n);
  const error = rmse(fp, q);

  const explore = await mountExplore(cap, "npu", levels);

  main.replaceChildren(
    el("h1", {}, ["NPU"]),
    el("p", { class: "lede warn" }, [
      "These products run in JavaScript and WASM on the CPU thread this browser scheduled. They do not run on the MediaTek NPU 990 or the CIM Super Efficient NPU. A web page cannot dispatch to that accelerator.",
    ]),
    explore.node,
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
  return { dispose: () => explore.dispose() };
}
