import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel } from "../dom.js";
import { fmt, fmtBytes } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { buildChase, timeChase } from "../sim/chase.js";
import { chaseJumps, referenceMarks } from "../sim/cache-curve.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { getSpecs } from "../specs.js";
import { mountExplore } from "./explore.js";

const SIZES = [32 * 1024, 256 * 1024, 2 * 1024 * 1024, 8 * 1024 * 1024];

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const levels = engineLevels(taxonomy, "cpu");
  const status = el("p", { class: "status", role: "status" }, ["Running the pointer chase…"]);
  const explore = await mountExplore(cap, "cpu", levels);

  main.replaceChildren(
    el("h1", {}, ["CPU"]),
    el("p", { class: "lede" }, [
      "Fifteen levels from the taxonomy. The chase reports ns/load on this device. Cited L2, L3, and SLC sizes are reference marks, not names read off the curve. L1 comes from the Arm manuals.",
    ]),
    status,
    explore.node,
    panel("Arm L1, from the manuals", [
      kv(
        "C1-Ultra",
        el("span", {}, [
          `I ${specs.soc.l1i_kb_c1_ultra.value} / D ${specs.soc.l1d_kb_c1_ultra.value} KB `,
          provCited(specs.soc.l1i_kb_c1_ultra),
        ]),
      ),
      kv(
        "C1-Premium",
        el("span", {}, [
          `I ${specs.soc.l1i_kb_c1_premium.value} / D ${specs.soc.l1d_kb_c1_premium.value} KB `,
          provCited(specs.soc.l1d_kb_c1_premium),
        ]),
      ),
      kv(
        "C1-Pro",
        el("span", {}, [
          `I ${specs.soc.l1i_kb_c1_pro.value} / D ${specs.soc.l1d_kb_c1_pro.value} KB `,
          provCited(specs.soc.l1i_kb_c1_pro),
        ]),
      ),
    ]),
  );
  const points = [];
  for (const bytes of SIZES) {
    const built = buildChase(bytes);
    const timed = timeChase(built, { minElapsedMs: 24 });
    points.push({ bytes, nsPerLoad: timed.nsPerLoad });
    status.textContent = `Chase ${fmtBytes(bytes)} · ${fmt(timed.nsPerLoad, 3)} ns/load`;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const jumps = chaseJumps(points);
  const marks = referenceMarks(specs);
  explore.setMeasured(points);
  explore.node.append(
    panel("Measured chase", [
      ...points.map((point) =>
        kv(
          fmtBytes(point.bytes),
          el("span", {}, [`${fmt(point.nsPerLoad, 3)} ns/load `, provMeasured("dependent pointer chase")]),
        ),
      ),
      note(
        jumps.length
          ? `Largest rises are at ${jumps.map((jump) => fmtBytes(jump.bytes)).join(", ")}. Those rises are not labeled L1.`
          : "No jump cleared the 1.35× threshold in this sweep.",
      ),
      note(`Reference marks, not fitted: ${marks.map((mark) => mark.label).join("; ")}.`),
    ]),
  );

  return { dispose: () => explore.dispose() };
}
