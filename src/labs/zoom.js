import { el, note, panel, readout, readoutGrid } from "../dom.js";
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
  buildQuantumField,
  makeMaterials,
  mountView,
} from "../graphics/view.js";
import { sceneUltra } from "../graphics/pu-scenes.js";

const SCALES = [
  { id: "phone", label: "1. Phone", exp: "10⁻¹ m", mm: 162.2, unit: "162.2 mm" },
  { id: "board", label: "2. Board", exp: "10⁻² m", mm: 72, unit: "72 mm PCB" },
  { id: "package", label: "3. PoP", exp: "10⁻² m", mm: 16.4, unit: "16.4 mm MT6993Z" },
  { id: "die", label: "4. Die", exp: "10⁻² m", mm: 12.92, unit: "140.57 mm²" },
  { id: "core", label: "5. C1-Ultra", exp: "10⁻³ m", mm: 1.8, unit: "3.26 mm² Core" },
  { id: "finfet", label: "6. FinFET", exp: "10⁻⁸ m", mm: 48e-6, unit: "48 nm CPP" },
  { id: "lattice", label: "7. Si Lattice", exp: "10⁻¹⁰ m", mm: 0.5431020511e-6, unit: "0.5431 nm" },
  { id: "quantum", label: "8. Electron / e⁺", exp: "10⁻¹⁵ m", mm: 2.426e-9, unit: "2.43 pm λc" },
];

export async function mount(main, { cap }) {
  const specs = getSpecs();
  const stage = el("div", { class: "stage tall" });
  const canvas = el("canvas", { "aria-label": "Zoom across 14 orders of magnitude from phone to quantum scale" });
  const scaleTag = el("b", {}, ["162.2 mm"]);
  const expTag = el("b", {}, ["10⁻¹ m"]);
  const caption = el("p", {});
  const hudTop = el("div", { class: "stage-hud-top" }, [
    el("div", { class: "hud-chip" }, ["SCALE ", expTag, " · ", scaleTag]),
    el("div", { class: "hud-chip" }, ["DRAG ORBIT · SCROLL DOLLY"]),
  ]);
  stage.append(canvas, hudTop, el("div", { class: "stage-caption" }, [caption]));

  const rail = el("div", { class: "level-rail", role: "tablist" });
  const sheet = el("div");
  let view = null;
  let activeUpdater = null;
  const materials = makeMaterials(cap.tier);

  try {
    view = await mountView(canvas, cap);
    view.setFrame((now) => {
      activeUpdater?.(now * 0.001);
    });
  } catch (error) {
    stage.append(note(error.message));
  }

  function show(id) {
    if (!view) return;
    view.clear();
    activeUpdater = null;
    let subject;
    if (id === "phone") {
      subject = buildPhone(materials, 0.35);
      activeUpdater = () => {
        subject.rotation.y += 0.003;
      };
    } else if (id === "board") {
      subject = buildBoard(materials);
    } else if (id === "package") {
      subject = buildPackage(materials);
      activeUpdater = () => {
        subject.rotation.y += 0.003;
      };
    } else if (id === "die") {
      subject = buildDie(materials);
    } else if (id === "core") {
      const u = sceneUltra(materials);
      subject = u.group;
      activeUpdater = () => u.update(0.016);
    } else if (id === "finfet") {
      subject = buildFinfet(materials);
      const drifters = [];
      subject.traverse((o) => {
        if (o.userData.drift) drifters.push(o);
      });
      activeUpdater = () => {
        for (let i = 0; i < drifters.length; i++) {
          const o = drifters[i];
          o.position.z += 0.03 * o.userData.drift.speed;
          if (o.position.z > 3.5) o.position.z = -3.5;
        }
      };
    } else if (id === "lattice") {
      subject = buildLattice(materials);
      activeUpdater = (t) => {
        subject.rotation.y = t * 0.25;
      };
    } else {
      subject = buildQuantumField(materials);
      activeUpdater = (t) => subject.userData.animateQuantum?.(t);
    }

    view.root.add(subject);
    view.frame(subject, 0.84);

    const scale = SCALES.find((item) => item.id === id);
    scaleTag.textContent = scale.unit;
    expTag.textContent = scale.exp;
    caption.textContent = `${scale.label} · Characteristic length ${scale.unit} (${scale.exp})`;
    for (const button of rail.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", button.dataset.id === id ? "true" : "false");
    }

    const nn = siliconNearestNeighbor();
    const copy = {
      phone:
        "Outer dimensions 162.2 × 77.5 × 8.25 mm (Xiaomi Global spec). Internal 7-layer stack reconstructed from the official Xiaomi ERP repair manual (53 pp) and FCC 2AFZZPTC0G exhibits.",
      board:
        "Compeq 1-P20-EV mainboard (~58 × 72 mm) housing 15 FCC-verified chips: MT6993Z + SK hynix H58GG6AV9H PoP, SK hynix HN8T271EJK UFS 4.1, MT6661/MT6667/MT6379 PMICs, MT6681 audio, MT6199W RF, MT6653 Wi-Fi 7, NU1671 wireless RX/TX.",
      package:
        "MT6993Z HB-MUFPOP (16.40 × 14.00 × 0.455 mm, 0.35 mm C4 ball pitch) carrying the 200 µm thinned Dimensity 9500 die beneath stacked SK hynix 12 GB LPDDR5X-9600 DRAM.",
      die: "Dimensity 9500 (BHJ11471B, 10.88 × 12.92 = 140.57 mm², ~30B transistors). Kurnal block areas: CPU 28.75 mm², Mali-G1 Ultra MC12 GPU 24.23 mm², NPU 990 12.60 mm².",
      core: "Arm C1-Ultra prime core (3.259 mm², 4.21 GHz, 10-wide decode, 23 issue ports, 64 KB L1I / 128 KB L1D / 2 MB L2, 512-bit shared SME2 unit).",
      finfet: `TSMC N3P FinFET: cited N3E/N3P 48 nm contacted gate pitch and 23 nm M0 metal pitch; 0.33 NA EUV scanners. Live cyan spheres model channel electron drift under inversion bias.`,
      lattice: `Diamond-cubic silicon crystal: NIST lattice constant a = 0.5431020511 nm; tetrahedral sp³ nearest-neighbor bond a√3/4 = ${(nn * 1e9).toFixed(5)} nm.`,
      quantum:
        "Sub-nanometer WKB gate-oxide tunneling barrier (evanescent ψ decay) alongside relativistic Dirac e⁻ / e⁺ trajectories (Compton wavelength λc = 2.426 pm, pair threshold 2mₑc² = 1.022 MeV vs EUV 91.84 eV & Si bandgap 1.12 eV).",
    };

    sheet.replaceChildren(
      panel(
        `${scale.label} — ${scale.unit}`,
        [
          note(copy[id]),
          id === "finfet" ? provCited(specs.soc.process_n3e_cpp_nm) : null,
          id === "die" ? referenceCards(["kurnal-die", "kurnal-pdf", "techinsights"]) : null,
        ],
        null,
        `Physical Scale · ${scale.exp}`,
      ),
    );
  }

  for (const scale of SCALES) {
    const button = el("button", { type: "button", dataset: { id: scale.id } }, [`${scale.label} (${scale.exp})`]);
    button.addEventListener("click", () => show(scale.id));
    rail.append(button);
  }

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["10⁻¹ m → 10⁻¹⁵ m"]),
      el("span", {}, ["14 ORDERS OF MAGNITUDE · ONE LIVE SUBJECT AT A TIME"]),
    ]),
    el("h1", {}, ["Powers of Ten: Chassis to Dirac Field"]),
    el("p", { class: "lede" }, [
      "Step across eight physical hierarchies — from the 162.2 mm glass-and-aluminum phone body through the Compeq PCB, MT6993Z PoP, 140.57 mm² die, C1-Ultra core, 48 nm FinFET, 0.543 nm Si crystal, down to WKB electron tunneling and relativistic e⁻/e⁺ kinematics.",
    ]),
    readoutGrid([
      readout("Dynamic Span", "10¹⁴×", "ratio", { tone: "accent", sub: "162.2 mm ÷ 2.43 pm" }),
      readout("Die Gross / Wafer", "458", "dies", { tone: "cyan", sub: "300 mm wafer (Kurnal)" }),
      readout("Si-Si Bond", `${(siliconNearestNeighbor() * 1e9).toFixed(4)}`, "nm", { tone: "ok", sub: "NIST a√3/4" }),
      readout("Compton λc", "2.426", "pm", { tone: "cyan", sub: "h / (mₑc)" }),
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
