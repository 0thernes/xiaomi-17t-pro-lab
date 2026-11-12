import { el, note, panel } from "../dom.js";
import { provCited } from "../provenance.js";
import { sceneFor } from "../graphics/pu-scenes.js";
import { makeMaterials, mountView } from "../graphics/view.js";

/**
 * One subject at a time. Changing level flies the camera by sliding the new
 * subject in and the old one out. Facets stay on the sheet.
 */
export async function mountExplore(cap, engine, levels) {
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": `${engine} explorable stack` });
  stage.append(canvas);
  const rail = el("div", { class: "level-rail" });
  const sheet = el("div");
  const wrap = el("div", {}, [stage, rail, sheet]);
  let view = null;
  const materials = makeMaterials(cap.tier, cap.renderer);
  try {
    view = await mountView(canvas, cap);
  } catch (error) {
    stage.append(note(error.message));
  }
  let current = null;
  let flying = false;
  const data = { points: null };

  function show(level) {
    for (const button of rail.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", button.dataset.id === level.id ? "true" : "false");
    }
    const built = sceneFor(engine, level.id, materials);
    const facet = level.facets?.structure;
    sheet.replaceChildren(
      panel(level.name, [
        facet ? el("p", {}, [facet.text]) : null,
        facet ? provCited({ status: facet.status, value: facet.text, source: facet.source || "" }) : null,
        note(built.note),
      ]),
    );
    if (!view) return;
    const previous = current;
    built.group.position.z = previous ? -28 : 0;
    view.root.add(built.group);
    current = built;
    if (!previous) {
      view.frame(built.group, 0.82);
      return;
    }
    flying = true;
    const start = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - start) / 560);
      const eased = u * u * (3 - 2 * u);
      built.group.position.z = -28 * (1 - eased);
      previous.group.position.z = 24 * eased;
      if (u < 1) {
        requestAnimationFrame(step);
        return;
      }
      view.root.remove(previous.group);
      flying = false;
      view.frame(built.group, 0.82);
    };
    requestAnimationFrame(step);
  }

  for (const level of levels) {
    const button = el("button", { type: "button", dataset: { id: level.id } }, [
      level.name.replace(/\(.*\)/, "").slice(0, 26),
    ]);
    button.addEventListener("click", () => show(level));
    rail.append(button);
  }
  if (levels[0]) show(levels[Math.min(6, levels.length - 1)]);

  if (view) {
    view.setFrame((now) => {
      if (!current || flying) return;
      current.update?.(0.016, data);
    });
  }

  return {
    node: wrap,
    setMeasured(points) {
      data.points = points;
    },
    dispose() {
      view?.dispose();
    },
  };
}
