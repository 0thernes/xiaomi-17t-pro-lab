import { el, note, panel } from "../dom.js";
import { referenceCards } from "../ref-card.js";
import { provCited } from "../provenance.js";
import { siliconNearestNeighbor } from "../sim/device-math.js";
import { getSpecs } from "../specs.js";
import {
  buildBoard,
  buildDie,
  buildFinfet,
  buildLattice,
  buildPackage,
  buildPhone,
  makeMaterials,
  mountView,
} from "../graphics/view.js";

const SCALES = [
  { id: "phone", label: "Phone", mm: 162.2 },
  { id: "board", label: "Board", mm: 78 },
  { id: "package", label: "Package", mm: 16.4 },
  { id: "die", label: "Die", mm: 12.92 },
  { id: "finfet", label: "FinFET", mm: 48e-6 },
  { id: "lattice", label: "Lattice", mm: 0.5431020511e-6 },
];

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": "Zoom from the phone to the silicon lattice" });
  const caption = el("p", {});
  stage.append(canvas, el("div", { class: "stage-caption" }, [caption]));
  const rail = el("div", { class: "level-rail", role: "tablist" });
  const sheet = el("div");
  let view = null;
  const materials = makeMaterials(cap.tier);
  try {
    view = await mountView(canvas, cap);
  } catch (error) {
    stage.append(note(error.message));
  }

  function show(id) {
    if (!view) return;
    view.clear();
    const builders = {
      phone: () => buildPhone(materials, 0),
      board: () => buildBoard(materials),
      package: () => buildPackage(materials),
      die: () => buildDie(materials),
      finfet: () => buildFinfet(materials),
      lattice: () => buildLattice(materials),
    };
    const subject = builders[id]();
    view.root.add(subject);
    view.frame(subject, 0.88);
    const scale = SCALES.find((item) => item.id === id);
    caption.textContent = `${scale.label}. Characteristic length ${scale.mm} mm. Die and package numbers are cited; the arrangement is a reconstruction.`;
    for (const button of rail.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", button.dataset.id === id ? "true" : "false");
    }
    const nn = siliconNearestNeighbor();
    sheet.replaceChildren(
      panel(scale.label, [
        note(
          id === "lattice"
            ? `Nearest-neighbor spacing a√3/4 = ${nn.toExponential(4)} m from the NIST lattice constant. This is silicon, not a fitted H2 bond.`
            : id === "finfet"
              ? `Gate pitch ${specs.soc.process_n3e_cpp_nm.value} nm and minimum metal pitch ${specs.soc.process_n3e_min_metal_pitch_nm.value} nm are the cited N3E rules N3P keeps. Fin height on this die is not published. EUV NA ${specs.soc.euv_numerical_aperture.value}.`
              : id === "die"
                ? "Block areas are Kurnal’s. Positions preserve those areas and are not a copy of the copyrighted die photo."
                : "Outer millimeters are the Xiaomi spec. The exploded stack names the repair-manual layers.",
        ),
        id === "finfet" ? provCited(specs.soc.process_n3e_cpp_nm) : null,
        id === "die" ? referenceCards(["kurnal-die", "kurnal-pdf", "techinsights"]) : null,
      ]),
    );
  }

  for (const scale of SCALES) {
    const button = el("button", { type: "button", dataset: { id: scale.id } }, [scale.label]);
    button.addEventListener("click", () => show(scale.id));
    rail.append(button);
  }

  main.replaceChildren(
    el("h1", {}, ["Zoom"]),
    el("p", { class: "lede" }, [
      "One subject is built at a time. The camera dollies between phone, die, FinFET pitch, and the silicon cell. Lower levels stay live; nothing else in the museum is constructed until you open it.",
    ]),
    stage,
    rail,
    sheet,
  );
  show("phone");
  return {
    dispose() {
      view?.dispose();
    },
  };
}
