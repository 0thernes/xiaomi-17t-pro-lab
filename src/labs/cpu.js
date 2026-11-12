import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import { el, kv, note, panel } from "../dom.js";
import { fmt, fmtBytes } from "../format.js";
import { provCited, provComputed, provMeasured } from "../provenance.js";
import { buildChase, timeChase } from "../sim/chase.js";
import { chaseJumps, referenceMarks } from "../sim/cache-curve.js";
import { createPipeline } from "../sim/pipeline.js";
import { engineLevels } from "../sim/taxonomy-walk.js";
import { getSpecs } from "../specs.js";
import { buildBars, buildDie, makeMaterials, mountView } from "../graphics/view.js";

const SIZES = [32 * 1024, 256 * 1024, 2 * 1024 * 1024, 8 * 1024 * 1024];

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const levels = engineLevels(taxonomy, "cpu");
  const status = el("p", { class: "status", role: "status" }, ["Running the pointer chase…"]);
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": "CPU die reconstruction and measured chase bars" });
  stage.append(canvas);
  const rail = el("div", { class: "level-rail" });
  const sheet = el("div");
  let view = null;
  const materials = makeMaterials(cap.tier);
  try {
    view = await mountView(canvas, cap);
    view.root.add(buildDie(materials));
    view.look(80);
  } catch (error) {
    stage.append(note(error.message));
  }

  const pipeline = createPipeline(
    [
      { op: "load", dst: 1, addr: 0 },
      { op: "add", dst: 2, a: 1, b: 1 },
      { op: "add", dst: 3, a: 2, b: 1 },
    ],
    { loadLatency: 3 },
  );
  const pipeOut = el("p", { class: "mono" }, ["pipeline idle"]);
  const stepButton = el("button", { type: "button", class: "primary" }, ["Step pipeline"]);
  stepButton.addEventListener("click", () => {
    const tick = pipeline.tick();
    pipeOut.textContent = `cycle ${tick.cycle} stalls ${tick.stalls} retired ${tick.retired} ${tick.occupied.map((item) => item.stage + ":" + item.op).join(" ")}`;
  });

  function select(level) {
    for (const button of rail.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", button.dataset.id === level.id ? "true" : "false");
    }
    const facet = level.facets.structure;
    sheet.replaceChildren(
      panel(level.name, [
        el("p", {}, [facet.text]),
        provCited({ status: facet.status, value: facet.text, source: facet.source || "" }),
        level.id === "cpu_l8_fu" || level.id === "cpu_l7_frontend" ? el("div", {}, [stepButton, pipeOut]) : null,
        note(
          "The pipeline is a five-stage in-order teaching model. It is not the unpublished C1 microarchitecture. L1 sizes below are the Arm manual figures in specs.json.",
        ),
      ]),
    );
    if (view && (level.id === "cpu_l5_cores" || level.id === "cpu_l4_dsu")) {
      view.clear();
      view.root.add(buildDie(materials));
      view.look(80);
    }
  }

  for (const level of levels) {
    const button = el("button", { type: "button", dataset: { id: level.id } }, [
      level.name.replace(/\(.*\)/, "").slice(0, 28),
    ]);
    button.addEventListener("click", () => select(level));
    rail.append(button);
  }

  main.replaceChildren(
    el("h1", {}, ["CPU"]),
    el("p", { class: "lede" }, [
      "Fifteen levels from the taxonomy. The chase reports ns/load on this device. Cited L2, L3, and SLC sizes are reference marks, not names read off the curve. L1 comes from the Arm manuals.",
    ]),
    status,
    stage,
    rail,
    sheet,
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
  select(levels[4]);

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
  if (view) {
    view.clear();
    view.root.add(buildBars(materials, points));
    view.look(18);
  }
  sheet.append(
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

  return {
    dispose() {
      view?.dispose();
    },
  };
}
