import { EPS_SI_R, EPS_SIO2_R, SI_BANDGAP_EV_TEXTBOOK, SI_LATTICE_M } from "../sim/constants.js";
import { doubleGateScaleLength, potentialDecay, shortChannelRatio } from "../sim/finfet.js";
import { energyAtAlphaA, kronigPenneyRhs, scanBands } from "../sim/kronig.js";
import { infiniteWellAnalyticEv, infiniteWellEnergies } from "../sim/schrodinger.js";
import { siliconNearestNeighbor } from "../sim/device-math.js";
import { getSpecs } from "../specs.js";
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed } from "../provenance.js";
import { mountSketch } from "../p5-loader.js";
import { buildFinfet, makeMaterials, mountView } from "../graphics/view.js";

const NIST = "https://physics.nist.gov/cuu/pdf/xray_2018.pdf";

export async function mount(main, ctx = {}) {
  const citedPitch = getSpecs().soc.process_n3e_cpp_nm.value;
  const length = range("Well width nm", 1, 6, 0.1, 2);
  const points = range("Interior points", 24, 64, 4, 40);
  const barrier = range("Kronig–Penney P", 0, 6, 0.1, 2);
  const pitch = range("Gate pitch nm", 24, 80, 1, citedPitch);
  const height = range("Fin height nm, drawing, not cited", 20, 90, 1, 60);
  const fin = range("Fin thickness nm, drawing, not cited", 4, 20, 0.5, 8);
  const eot = range("EOT nm, drawing, not cited", 0.5, 3, 0.1, 1);
  const gate = range("Gate length nm, drawing, not cited", 8, 40, 1, 20);
  const reset = el("button", { type: "button" }, [`Reset pitch to ${citedPitch} nm`]);
  const drawing = await transistorStage(ctx.cap);
  const wellHost = el("div");
  const bandHost = el("div");
  const finHost = el("div");
  const plotHost = el("div", { class: "plot" });

  main.replaceChildren(
    el("h1", {}, ["Transistor and bands"]),
    el("p", { class: "lede" }, [
      "A finite-difference Schrödinger well, a Dirac-comb Kronig–Penney scan, and a double-gate scale length. TSMC N3P is FinFET. Fin height, fin count, and the high-k stack of this tapeout are UNKNOWN. The sliders are a model, not a TEM of the 9500.",
    ]),
    panel("Drawing", [
      note(
        `${citedPitch} nm is the cited N3E contacted-poly pitch. Reset restores that pitch. Fin height, fin thickness, EOT, and gate length are a drawing. They are not a TEM of this die.`,
      ),
      pitch.node,
      height.node,
      reset,
      drawing.node,
    ]),
    panel("1D infinite well", [length.node, points.node, wellHost]),
    panel("Kronig–Penney", [barrier.node, bandHost]),
    panel("FinFET electrostatics", [fin.node, eot.node, gate.node, finHost, plotHost]),
    panel("Silicon, generic", [
      kv(
        "Lattice parameter",
        el("span", {}, [
          `${SI_LATTICE_M.toExponential(9)} m `,
          provCited({ value: SI_LATTICE_M, status: "confirmed", source: NIST }),
        ]),
      ),
      kv(
        "Nearest neighbor",
        el("span", {}, [`${fmt(siliconNearestNeighbor() * 1e9, 5)} nm `, provComputed("a √3 / 4")]),
      ),
      kv(
        "Indirect gap, textbook 300 K",
        el("span", {}, [
          `${SI_BANDGAP_EV_TEXTBOOK} eV `,
          provCited({
            value: SI_BANDGAP_EV_TEXTBOOK,
            status: "confirmed",
            source: "Sze, Physics of Semiconductor Devices; see docs/research/deep-dive.md",
          }),
        ]),
      ),
      note("GAA nanosheets are the public TSMC N2 contrast. They are not drawn as the Dimensity 9500 channel."),
    ]),
  );

  const sketch = await mountSketch(plotHost, drawFin);
  function recompute() {
    const L = Number(length.input.value);
    const nPoints = Number(points.input.value);
    const energies = infiniteWellEnergies(L, nPoints);
    wellHost.replaceChildren();
    for (let n = 1; n <= 3; n++) {
      const analytic = infiniteWellAnalyticEv(L, n);
      const rel = Math.abs(energies[n - 1] - analytic) / analytic;
      wellHost.append(
        kv(
          `E${n}`,
          el("span", {}, [
            `${fmt(energies[n - 1], 4)} eV FD, ${fmt(analytic, 4)} eV analytic, rel ${fmt(rel, 3)} `,
            provComputed("FD tridiagonal versus n²π²ħ²/(2mL²)"),
          ]),
        ),
      );
    }
    const P = Number(barrier.input.value);
    const aNm = SI_LATTICE_M * 1e9;
    const scan = scanBands({ aNm, P, eMaxEv: energyAtAlphaA(Math.PI * 3.2, aNm), samples: 240 });
    const allowed = scan.filter((point) => point.allowed).length;
    bandHost.replaceChildren(
      kv(
        "Spacing a",
        el("span", {}, [`${fmt(aNm, 5)} nm `, provComputed("NIST lattice parameter × 1e9, used as the model period")]),
      ),
      kv(
        "Allowed samples",
        el("span", {}, [`${allowed} / ${scan.length} `, provComputed("|cos(αa) + P sin(αa)/(αa)| ≤ 1")]),
      ),
      kv(
        "RHS at αa = π",
        el("span", {}, [
          `${fmt(kronigPenneyRhs(energyAtAlphaA(Math.PI, aNm), aNm, P), 4)} `,
          provComputed("analytic edge, equals −1"),
        ]),
      ),
      note(
        P === 0
          ? "P = 0 is a free electron: every positive energy is allowed."
          : "A gap opens above αa = π when P is large enough that the right-hand side leaves [−1, 1].",
      ),
    );
    const tSi = Number(fin.input.value);
    const tOx = Number(eot.input.value);
    const lg = Number(gate.input.value);
    const lambda = doubleGateScaleLength(EPS_SI_R, tSi, EPS_SIO2_R, tOx);
    const ratio = shortChannelRatio(lg, lambda);
    finHost.replaceChildren(
      kv("λ", el("span", {}, [`${fmt(lambda, 4)} nm `, provComputed("sqrt(εsi·tsi·tox / (2·εox)), εr 11.7 and 3.9")])),
      kv("Lg / λ", el("span", {}, [`${fmt(ratio, 3)} `, provComputed("illustrative gate length / scale length")])),
      kv("ψ(λ)/ψ(0)", el("span", {}, [`${fmt(potentialDecay(lambda, lambda), 4)} `, provComputed("exp(−1)")])),
      note(
        "Double-gate formula used as the sketch’s scale length. A real fin is gated on three sides; the N3P geometry is unpublished. SiO2 EOT stands in for an unknown high-k stack.",
      ),
    );
    sketch.setState({ lambda, tSi, tOx, lg, finHeightNm: Number(height.input.value) });
    drawing.setGeometry({
      pitchNm: Number(pitch.input.value),
      finHeightNm: Number(height.input.value),
      finThickNm: tSi,
      gateNm: lg,
      eotNm: tOx,
    });
  }
  reset.addEventListener("click", () => {
    pitch.input.value = String(citedPitch);
    pitch.input.dispatchEvent(new Event("input"));
  });
  for (const control of [length, points, barrier, pitch, height, fin, eot, gate]) {
    control.input.addEventListener("input", recompute);
  }
  recompute();
  return {
    dispose() {
      sketch.dispose();
      drawing.dispose();
    },
  };
}

async function transistorStage(cap) {
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": "FinFET drawing with source, drain, high-k wrap, and gate" });
  stage.append(canvas);
  let view = null;
  let materials = null;
  let current = null;
  try {
    view = await mountView(canvas, cap || { tier: "medium", pixelRatio: 1 });
    materials = makeMaterials(cap?.tier || "medium");
  } catch (error) {
    stage.append(note(error.message));
  }
  return {
    node: stage,
    setGeometry(params) {
      if (!view || !materials) return;
      if (current) {
        view.root.remove(current);
        current.traverse((child) => child.geometry?.dispose?.());
      }
      current = buildFinfet(materials, params);
      view.root.add(current);
      view.frame(current, 0.8);
    },
    dispose() {
      view?.dispose();
    },
  };
}

function range(label, min, max, step, value) {
  const input = el("input", {
    type: "range",
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value),
    "aria-label": label,
  });
  const output = el("output", {}, [String(value)]);
  input.addEventListener("input", () => {
    output.textContent = input.value;
  });
  return { node: el("label", { class: "slider" }, [el("span", {}, [label]), input, output]), input };
}

function drawFin(p, state) {
  p.background("#1c1e18");
  if (!state.lg) return;
  const cx = p.width / 2;
  const base = p.height - 36;
  const scale = 4;
  const finW = Math.min(80, state.tSi * scale);
  const finH = 40 + (state.finHeightNm || 60) * 1.2;
  p.noStroke();
  p.fill("#3a3d32");
  p.rect(40, base, p.width - 80, 16);
  p.fill("#8ec8d8");
  p.rect(cx - finW / 2 - state.tOx * scale, base - finH - 8, finW + state.tOx * scale * 2, finH + 8);
  p.fill("#e08a4f");
  p.rect(cx - finW / 2, base - finH, finW, finH);
  p.fill("#f4f0e6");
  p.textSize(12);
  p.text("gate", cx - finW / 2 - 36, base - finH);
  p.text("fin (illustrative)", cx + finW / 2 + 8, base - finH / 2);
  p.text(`λ ${state.lambda.toFixed(2)} nm`, 16, 20);
}
