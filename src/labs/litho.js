import { EUV_LAMBDA_NM, NA_HIGH, NA_LOW } from "../sim/constants.js";
import { aerialImage } from "../sim/lithography.js";
import { euvReference, rayleighCd } from "../sim/rayleigh.js";
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed } from "../provenance.js";
import { mountSketch } from "../p5-loader.js";
import { sceneLitho } from "../graphics/pu-scenes.js";
import { makeMaterials, mountView } from "../graphics/view.js";

const ASML = "https://www.asml.com/en/technology/lithography-principles/rayleigh-criterion";

export async function mount(main, ctx = {}) {
  const ref = euvReference();
  const state = { na: NA_LOW, k1: 0.4, pitch: 60, sigma: 0 };
  const readouts = el("div");
  const plotHost = el("div", { class: "plot" });
  const na = el("select", { "aria-label": "Numerical aperture" }, [
    el("option", { value: String(NA_LOW) }, ["0.33 low-NA, the 3 nm-class tool"]),
    el("option", { value: String(NA_HIGH) }, ["0.55 high-NA, contrast only, not claimed for N3P"]),
  ]);
  const k1 = range("k1", 0.25, 0.8, 0.01, state.k1);
  const pitch = range("Pitch nm", 12, 120, 1, state.pitch);
  const sigma = range("Source sigma", 0, 0.9, 0.05, state.sigma);

  main.replaceChildren(
    el("h1", {}, ["Lithography, computed"]),
    el("p", { class: "lede" }, [
      "Rayleigh’s criterion and a 1D Abbe aerial image, evaluated in the page. EUV is 13.5 nm. High-NA 0.55 is not a claim about the Dimensity 9500 mask set. N3P pitches are UNKNOWN, so this is not a TSMC ground rule.",
    ]),
    panel("Scanner", [
      na,
      k1.node,
      pitch.node,
      sigma.node,
      readouts,
      kv(
        "ASML published resolution",
        el("span", {}, [
          `${ref.asmlLowNaNm} nm at NA 0.33, ${ref.asmlHighNaNm} nm at NA 0.55 `,
          provCited({ value: ref.asmlLowNaNm, status: "confirmed", source: ASML }),
        ]),
      ),
      note(
        "The physical limit k1 = 0.25 is tighter than the coherent two-beam cutoff at k1 = 0.5. A coherent image of equal lines and spaces loses the first orders once the half-pitch drops below 0.5 λ/NA.",
      ),
    ]),
    panel("Scanner and resist", [
      await scannerStage(ctx.cap),
      note("Software-friendly cutaway. The resist surface is the same Abbe intensity as the plot below."),
    ]),
    panel("Aerial image", [plotHost]),
  );

  const sketch = await mountSketch(plotHost, drawImage);
  function recompute() {
    state.na = Number(na.value);
    state.k1 = Number(k1.input.value);
    state.pitch = Number(pitch.input.value);
    state.sigma = Number(sigma.input.value);
    const cd = rayleighCd(state.k1, state.na, EUV_LAMBDA_NM);
    const image = aerialImage({
      na: state.na,
      pitchNm: state.pitch,
      duty: 0.5,
      sigma: state.sigma,
      n: 256,
      periods: 4,
    });
    readouts.replaceChildren(
      kv(
        "CD = k1 λ / NA",
        el("span", {}, [`${fmt(cd, 4)} nm `, provComputed(`${state.k1} × ${EUV_LAMBDA_NM} / ${state.na}`)]),
      ),
      kv(
        "k1 = 0.25 limit at this NA",
        el("span", {}, [`${fmt(rayleighCd(0.25, state.na), 4)} nm `, provComputed("0.25 × 13.5 / NA")]),
      ),
      kv(
        "Michelson contrast",
        el("span", {}, [`${fmt(image.contrast, 4)} `, provComputed("(Imax − Imin) / (Imax + Imin)")]),
      ),
      kv("First diffracted order, coherent pupil", image.firstOrderPassesCoherent ? "passes" : "blocked"),
      note(
        `Cutoff ${fmt(image.cutoffPerNm, 4)} cycles/nm. First order ${fmt(image.firstOrderPerNm, 4)} cycles/nm. Equal-weight Abbe points, not an ASML illuminator.`,
      ),
    );
    sketch.setState({ image, pitch: state.pitch });
  }
  na.addEventListener("change", recompute);
  for (const control of [k1, pitch, sigma]) control.input.addEventListener("input", recompute);
  recompute();
  return { dispose: () => sketch.dispose() };
}

async function scannerStage(cap) {
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": "EUV scanner cutaway and live resist intensity" });
  stage.append(canvas);
  try {
    const view = await mountView(canvas, cap || { tier: "medium", pixelRatio: 1 });
    const built = sceneLitho(makeMaterials(cap?.tier || "medium"));
    view.root.add(built.group);
    view.scene.background = new view.THREE.Color(0x1a2430);
    view.scene.fog = null;
    built.group.scale.setScalar(2.2);
    view.release();
    view.orbit.set(34, new view.THREE.Vector3(1, 1.6, 0));
    view.orbit.pose(0.55, 1.15);
    view.setFrame(() => built.update?.(0.016));
  } catch (error) {
    stage.append(note(error.message));
  }
  return stage;
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

function drawImage(p, state) {
  p.background("#1c1e18");
  const image = state.image;
  if (!image) return;
  const left = 16;
  const right = p.width - 12;
  const mid = p.height * 0.48;
  const bottom = p.height - 16;
  p.stroke("#8ec8d8");
  p.noFill();
  p.beginShape();
  const mask = image.mask;
  for (let i = 0; i < mask.length; i += 2) {
    const x = left + (i / (mask.length - 1)) * (right - left);
    const y = mid - mask[i] * (mid - 20);
    p.vertex(x, y);
  }
  p.endShape();
  p.stroke("#e08a4f");
  p.beginShape();
  const intensity = image.intensity;
  let max = 0.001;
  for (const value of intensity) max = Math.max(max, value);
  for (let i = 0; i < intensity.length; i += 2) {
    const x = left + (i / (intensity.length - 1)) * (right - left);
    const y = bottom - (intensity[i] / max) * (bottom - mid - 12);
    p.vertex(x, y);
  }
  p.endShape();
  p.noStroke();
  p.fill("#c8c2b4");
  p.textSize(12);
  p.text("mask", left, 16);
  p.text("aerial image", left, mid + 14);
}
