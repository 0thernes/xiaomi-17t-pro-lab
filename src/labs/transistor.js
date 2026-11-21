import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { sceneFinfet, sceneWave } from "../graphics/pu-scenes.js";
import { makeMaterials, mountView } from "../graphics/view.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed } from "../provenance.js";
import { EPS_SI_R, EPS_SIO2_R, SI_BANDGAP_EV_TEXTBOOK, SI_LATTICE_M } from "../sim/constants.js";
import { siliconNearestNeighbor } from "../sim/device-math.js";
import {
  COMPTON_WAVELENGTH_PM,
  ELECTRON_REST_MEV,
  PAIR_THRESHOLD_MEV,
  diracDispersion,
  siliconIntrinsicCarriers,
  wellStates,
  wkbTunnelTransmission,
} from "../sim/dirac-tunnel.js";
import { doubleGateScaleLength, potentialDecay, shortChannelRatio } from "../sim/finfet.js";
import { energyAtAlphaA, kronigPenneyRhs, scanBands } from "../sim/kronig.js";
import { infiniteWellAnalyticEv } from "../sim/schrodinger.js";

const NIST = "https://physics.nist.gov/cuu/pdf/xray_2018.pdf";

export async function mount(main, { cap }) {
  // Interactive 3D Stage toggling between N3P FinFET vs N2 GAA and Quantum/Dirac Field
  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "3D FinFET vs GAA and Quantum Electron-Positron Field" });
  let view = null;
  let activeUpdater = null;
  const materials = makeMaterials(cap.tier);

  const modeFinBtn = el("button", { type: "button", class: "hud-btn", "aria-pressed": "true" }, [
    "N3P FinFET vs N2 GAA",
  ]);
  const modeQBtn = el("button", { type: "button", class: "hud-btn", "aria-pressed": "false" }, [
    "WKB Tunnel + Dirac e⁻/e⁺",
  ]);
  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["SCALE ", el("b", {}, ["48 nm FinFET → 0.543 nm Si → 2.43 pm λc"])]),
      el("div", { class: "hud-actions" }, [modeFinBtn, modeQBtn]),
    ]),
  );

  function set3dMode(which) {
    if (!view) return;
    view.clear();
    const s = which === "quantum" ? sceneWave(materials) : sceneFinfet(materials);
    view.root.add(s.group);
    view.frame(s.group, 0.85);
    activeUpdater = (dt) => s.update(dt);
    modeFinBtn.setAttribute("aria-pressed", which !== "quantum" ? "true" : "false");
    modeQBtn.setAttribute("aria-pressed", which === "quantum" ? "true" : "false");
  }
  modeFinBtn.addEventListener("click", () => set3dMode("finfet"));
  modeQBtn.addEventListener("click", () => set3dMode("quantum"));

  try {
    view = await mountView(canvas, cap);
    set3dMode("finfet");
    view.setFrame(() => activeUpdater?.(0.016));
  } catch (err) {
    stage.append(note(`3D stage unavailable: ${err.message}`));
  }

  // Controls
  const wellLen = rangeControl("Quantum Well Width L (nm)", 1.0, 6.0, 0.1, 2.0, (v) => `${v.toFixed(1)} nm`);
  const wellPts = rangeControl("FD Grid Interior Points", 24, 64, 4, 40, (v) => `${v} pts`);
  const kpCtrl = rangeControl("Kronig–Penney Barrier P", 0, 6, 0.1, 2.4, (v) => v.toFixed(1));
  const finCtrl = rangeControl("Fin Thickness t_si (nm)", 4, 18, 0.5, 6.5, (v) => `${v.toFixed(1)} nm`);
  const eotCtrl = rangeControl("Gate Oxide EOT t_ox (nm)", 0.5, 2.8, 0.05, 0.85, (v) => `${v.toFixed(2)} nm`);
  const gateCtrl = rangeControl("Gate Length Lg (nm)", 8, 36, 1, 16, (v) => `${v} nm`);
  const tempCtrl = rangeControl(
    "Junction Temp T (K)",
    250,
    420,
    5,
    315,
    (v) => `${v} K (${(v - 273.15).toFixed(0)}°C)`,
  );
  const momCtrl = rangeControl("Relativistic Momentum p·c (MeV)", 0, 2.5, 0.05, 0.75, (v) => `${v.toFixed(2)} MeV`);

  const wellHost = el("div");
  const wellPlot = el("div", { class: "plot" });
  const kpHost = el("div");
  const kpPlot = el("div", { class: "plot" });
  const finHost = el("div");
  const finPlot = el("div", { class: "plot" });
  const diracHost = el("div");
  const diracPlot = el("div", { class: "plot" });

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["10⁻⁸ m → 10⁻¹⁵ m · QUANTUM & QED"]),
      el("span", {}, ["SCHRÖDINGER · WKB TUNNELING · KRONIG–PENNEY · DIRAC e⁻ / e⁺"]),
    ]),
    el("h1", {}, ["Transistor, Atomic Lattice, Electrons & Positrons"]),
    el("p", { class: "lede" }, [
      "TSMC N3P is a FinFET process (GAA nanosheets are TSMC N2 contrast only). Below, four live numerical physics engines solve finite-difference Schrödinger confinement, WKB gate-oxide tunneling leakage, Kronig–Penney silicon bandgaps, thermal carrier runaway, and relativistic Dirac electron-positron dispersion.",
    ]),
    readoutGrid([
      readout("Si Lattice a", "0.54310", "nm", {
        tone: "cyan",
        sub: `sp³ bond ${(siliconNearestNeighbor() * 1e9).toFixed(4)} nm (NIST)`,
      }),
      readout("Si Bandgap (300 K)", `${SI_BANDGAP_EV_TEXTBOOK}`, "eV", { tone: "ok", sub: "Indirect e⁻/h⁺ pair gap" }),
      readout("Dirac e⁻/e⁺ Pair", `${PAIR_THRESHOLD_MEV.toFixed(3)}`, "MeV", {
        tone: "accent",
        sub: `2mₑc² · λc = ${COMPTON_WAVELENGTH_PM.toFixed(3)} pm`,
      }),
      readout("Process Node", "TSMC N3P", "FinFET", { tone: "cyan", sub: "48 nm CPP · 23 nm M0" }),
    ]),
    stage,
    el("div", { class: "grid cols-2" }, [
      panel(
        "1D Quantum Well Eigenstates & WKB Tunneling",
        [wellLen.node, wellPts.node, wellPlot, wellHost],
        null,
        "FINITE-DIFFERENCE JACOBI",
      ),
      panel(
        "Kronig–Penney Crystal Bands & Silicon Gap",
        [kpCtrl.node, kpPlot, kpHost],
        null,
        "BLOCH PERIODIC POTENTIAL",
      ),
    ]),
    el("div", { class: "grid cols-2" }, [
      panel(
        "FinFET Electrostatics, Gate Leakage & Thermal Runaway",
        [finCtrl.node, eotCtrl.node, gateCtrl.node, tempCtrl.node, finPlot, finHost],
        null,
        "N3P ELECTROSTATICS",
      ),
      panel(
        "Relativistic Dirac Sea: Electrons (e⁻), Positrons (e⁺) & Silicon Holes (h⁺)",
        [
          momCtrl.node,
          diracPlot,
          diracHost,
          kv(
            "NIST Lattice Constant",
            el("span", {}, [
              `${SI_LATTICE_M.toExponential(9)} m `,
              provCited({ value: SI_LATTICE_M, status: "confirmed", source: NIST }),
            ]),
          ),
        ],
        null,
        "QED E = ±√(p²c² + mₑ²c⁴)",
      ),
    ]),
  );

  const wellSketch = await mountSketch(wellPlot, drawWell, { height: 220 });
  const kpSketch = await mountSketch(kpPlot, drawKp, { height: 220 });
  const finSketch = await mountSketch(finPlot, drawFinTunnel, { height: 220 });
  const diracSketch = await mountSketch(diracPlot, drawDirac, { height: 220 });

  function recompute() {
    const L = Number(wellLen.input.value);
    const pts = Number(wellPts.input.value);
    const { energies, grid } = wellStates(L, pts);
    wellHost.replaceChildren(
      ...[1, 2, 3].map((n) => {
        const analytic = infiniteWellAnalyticEv(L, n);
        const rel = Math.abs(energies[n - 1] - analytic) / analytic;
        return kv(
          `E${n}`,
          el("span", {}, [
            `${fmt(energies[n - 1], 4)} eV FD, ${fmt(analytic, 4)} eV analytic (rel ${fmt(rel, 3)}) `,
            provComputed("n²π²ħ²/(2mL²)"),
          ]),
        );
      }),
    );
    wellSketch.setState({ grid, L, energies });

    const P = Number(kpCtrl.input.value);
    const aNm = SI_LATTICE_M * 1e9;
    const scan = scanBands({ aNm, P, eMaxEv: energyAtAlphaA(Math.PI * 3.2, aNm), samples: 240 });
    const allowed = scan.filter((pt) => pt.allowed).length;
    kpHost.replaceChildren(
      kv(
        "Allowed Energy Bands",
        el("span", {}, [`${allowed} / ${scan.length} samples `, provComputed("|cos(αa) + P sin(αa)/(αa)| ≤ 1")]),
      ),
      kv(
        "Band Edge at αa = π",
        el("span", {}, [
          `${fmt(kronigPenneyRhs(energyAtAlphaA(Math.PI, aNm), aNm, P), 4)} `,
          provComputed("exact edge = −1"),
        ]),
      ),
    );
    kpSketch.setState({ scan, P });

    const tSi = Number(finCtrl.input.value);
    const tOx = Number(eotCtrl.input.value);
    const lg = Number(gateCtrl.input.value);
    const T = Number(tempCtrl.input.value);
    const lambda = doubleGateScaleLength(EPS_SI_R, tSi, EPS_SIO2_R, tOx);
    const ratio = shortChannelRatio(lg, lambda);
    const wkb = wkbTunnelTransmission({ energyEv: 0.25, barrierEv: 3.1, thicknessNm: tOx, effMassRatio: 0.5 });
    const carrier = siliconIntrinsicCarriers(T);
    finHost.replaceChildren(
      kv(
        "Scale Length λ & Lg/λ",
        el("span", {}, [`λ=${fmt(lambda, 3)} nm · Lg/λ=${fmt(ratio, 3)} `, provComputed("√(εsi·tsi·tox / 2εox)")]),
      ),
      kv(
        "WKB Oxide Tunneling T(E)",
        el("span", {}, [
          `${wkb.transmission.toExponential(3)} `,
          provComputed(`exp(−2κ·${tOx}nm), κ=${fmt(wkb.kappaPerNm, 3)}/nm`),
        ]),
      ),
      kv(
        "Intrinsic Carriers n_i(T)",
        el("span", {}, [
          `${carrier.niCm3.toExponential(3)} cm⁻³ (Eg=${carrier.egEv.toFixed(3)} eV) `,
          provComputed("Varshni + Sze thermal law"),
        ]),
      ),
      kv("ψ(λ)/ψ(0)", el("span", {}, [`${fmt(potentialDecay(lambda, lambda), 4)} `, provComputed("exp(−1)")])),
    );
    finSketch.setState({ tSi, tOx, lg, lambda, wkb });

    const pMeVc = Number(momCtrl.input.value);
    const dirac = diracDispersion(pMeVc);
    diracHost.replaceChildren(
      kv(
        "Electron Branch +E(p)",
        el("span", {}, [
          `+${dirac.electronMeV.toFixed(4)} MeV (v/c = ${dirac.beta.toFixed(3)}, γ = ${dirac.gamma.toFixed(3)}) `,
          provComputed("√(p²c² + mₑ²c⁴)"),
        ]),
      ),
      kv(
        "Positron Sea −E(p)",
        el("span", {}, [
          `${dirac.positronDiracSeaMeV.toFixed(4)} MeV · Pair threshold ${PAIR_THRESHOLD_MEV.toFixed(4)} MeV `,
          provComputed("2mₑc² QED vacuum gap"),
        ]),
      ),
      note(
        "Scale honesty: Dimensity 9500 transistors operate at ~0.7–1.1 V (e⁻/h⁺ quasiparticle pairs across Si's 1.12 eV gap) and EUV lithography uses 91.84 eV photons (photoelectric emission); true vacuum e⁻/e⁺ pair creation requires 1.022 MeV (>11,000× higher than EUV).",
      ),
    );
    diracSketch.setState({ dirac, pMeVc });
  }

  for (const c of [wellLen, wellPts, kpCtrl, finCtrl, eotCtrl, gateCtrl, tempCtrl, momCtrl]) {
    c.input.addEventListener("input", recompute);
  }
  recompute();

  return {
    dispose() {
      wellSketch.dispose();
      kpSketch.dispose();
      finSketch.dispose();
      diracSketch.dispose();
      view?.dispose();
    },
  };
}

function drawWell(p, state) {
  p.background("#06080c");
  const { grid, L } = state;
  if (!grid) return;
  const padL = 24;
  const padR = 16;
  const w = p.width - padL - padR;
  const colors = ["#38d4f2", "#ff6900", "#a78bfa"];
  const keys = ["psi1", "psi2", "psi3"];
  const maxAmp = Math.sqrt(2 / L);

  for (let n = 0; n < 3; n++) {
    const base = p.height - 26 - n * 62;
    p.stroke("#1c2638");
    p.line(padL, base, padL + w, base);
    p.stroke(colors[n]);
    p.strokeWeight(2.2);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < grid.length; i++) {
      const x = padL + (i / (grid.length - 1)) * w;
      const prob = (grid[i][keys[n]] / maxAmp) ** 2;
      p.vertex(x, base - prob * 46);
    }
    p.endShape();
    p.noStroke();
    p.fill(colors[n]);
    p.textSize(10);
    p.text(`|ψ${n + 1}|²`, padL + 4, base - 48);
  }
}

function drawKp(p, state) {
  p.background("#06080c");
  const scan = state.scan;
  if (!scan) return;
  const padL = 32;
  const padR = 14;
  const w = p.width - padL - padR;
  const mid = p.height / 2;
  const scaleY = (p.height - 48) / 6;

  // Allowed strip [-1, +1]
  p.noStroke();
  p.fill("rgba(74, 222, 128, 0.12)");
  p.rect(padL, mid - scaleY, w, scaleY * 2);
  p.stroke("#4ade80");
  p.line(padL, mid - scaleY, padL + w, mid - scaleY);
  p.line(padL, mid + scaleY, padL + w, mid + scaleY);

  p.stroke("#38d4f2");
  p.strokeWeight(2);
  p.noFill();
  p.beginShape();
  for (let i = 0; i < scan.length; i++) {
    const x = padL + (i / (scan.length - 1)) * w;
    const clamped = Math.max(-2.8, Math.min(2.8, scan[i].rhs));
    p.vertex(x, mid - clamped * scaleY);
  }
  p.endShape();

  p.noStroke();
  p.fill("#4ade80");
  p.textSize(10);
  p.text("GREEN = ALLOWED ENERGY BANDS (|RHS| ≤ 1) · GAPS OPEN WHERE CURVE EXITS BAND", padL, 14);
}

function drawFinTunnel(p, state) {
  p.background("#06080c");
  if (!state.tOx) return;
  const padL = 48;
  const padR = 16;
  const padT = 24;
  const padB = 28;
  const w = p.width - padL - padR;
  const h = p.height - padT - padB;

  // Log10 WKB Tunnel Transmission vs EOT (0.5..2.8 nm)
  p.stroke("#1c2638");
  for (let i = 0; i <= 4; i++) p.line(padL, padT + (i / 4) * h, padL + w, padT + (i / 4) * h);

  p.stroke("#ff6900");
  p.strokeWeight(2.4);
  p.noFill();
  p.beginShape();
  for (let i = 0; i <= 60; i++) {
    const tox = 0.5 + (i / 60) * 2.3;
    const T = wkbTunnelTransmission({
      energyEv: 0.25,
      barrierEv: 3.1,
      thicknessNm: tox,
      effMassRatio: 0.5,
    }).transmission;
    const logT = Math.max(-18, Math.log10(Math.max(1e-18, T)));
    const x = padL + (i / 60) * w;
    const y = padT + (-logT / 18) * h;
    p.vertex(x, y);
  }
  p.endShape();

  // Current operating point
  const curLog = Math.max(-18, Math.log10(Math.max(1e-18, state.wkb.transmission)));
  const cx = padL + ((state.tOx - 0.5) / 2.3) * w;
  const cy = padT + (-curLog / 18) * h;
  p.fill("#38d4f2");
  p.noStroke();
  p.circle(cx, cy, 9);
  p.fill("#eef3fa");
  p.textSize(10);
  p.text(`WKB GATE TUNNELING LOG₁₀ T(E) vs EOT · λ=${state.lambda.toFixed(2)} nm`, padL, 14);
  p.fill("#6f819c");
  p.text("0.5 nm", padL, p.height - 8);
  p.textAlign(p.RIGHT);
  p.text("2.8 nm", padL + w, p.height - 8);
}

function drawDirac(p, state) {
  p.background("#06080c");
  const padL = 44;
  const padR = 16;
  const w = p.width - padL - padR;
  const midX = padL + w / 2;
  const midY = p.height / 2;
  const maxE = 3.0;
  const yScale = (p.height - 40) / (2 * maxE);

  // Shaded 2mc^2 = 1.022 MeV QED Vacuum Mass Gap
  const gapPx = ELECTRON_REST_MEV * yScale;
  p.noStroke();
  p.fill("rgba(167, 139, 250, 0.14)");
  p.rect(padL, midY - gapPx, w, gapPx * 2);

  // Light cone E = ±pc
  p.stroke("rgba(159, 176, 200, 0.22)");
  p.line(padL, midY - 2.5 * yScale, padL + w, midY + 2.5 * yScale);
  p.line(padL, midY + 2.5 * yScale, padL + w, midY - 2.5 * yScale);

  // Upper electron hyperbola (+E, cyan) & lower positron Dirac sea (-E, rose)
  for (const [sign, col] of [
    [1, "#38d4f2"],
    [-1, "#fb7185"],
  ]) {
    p.stroke(col);
    p.strokeWeight(2.4);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= 80; i++) {
      const pc = -2.5 + (i / 80) * 5.0;
      const E = Math.sqrt(pc * pc + ELECTRON_REST_MEV ** 2);
      p.vertex(padL + (i / 80) * w, midY - sign * E * yScale);
    }
    p.endShape();
  }

  // Active momentum point on both electron & positron branches
  const px = midX + (state.pMeVc / 2.5) * (w / 2);
  const ey = state.dirac.electronMeV * yScale;
  p.noStroke();
  p.fill("#38d4f2");
  p.circle(px, midY - ey, 9);
  p.fill("#fb7185");
  p.circle(px, midY + ey, 9);

  p.fill("#38d4f2");
  p.textSize(10);
  p.text("+E(p) Electron (e⁻)", padL + 4, 14);
  p.fill("#fb7185");
  p.text("−E(p) Positron Dirac Sea (e⁺)", padL + 4, p.height - 8);
  p.fill("#c084fc");
  p.textAlign(p.CENTER);
  p.text("2mₑc² = 1.022 MeV Gap", midX, midY + 4);
}
