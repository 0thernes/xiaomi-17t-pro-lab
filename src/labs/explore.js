import { el, note, panel } from "../dom.js";
import { provCited } from "../provenance.js";
import { sceneFor } from "../graphics/pu-scenes.js";
import { makeMaterials, mountView } from "../graphics/view.js";

/**
 * Explorable 3D taxonomy stack for CPU (15 levels), GPU (16 levels), and NPU (14 levels).
 * Builds one high-detail subject at a time and smoothly flies between layers.
 */
export async function mountExplore(cap, engine, levels) {
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": `${engine} explorable 3D architecture stack` });
  const hudLevel = el("b", {}, ["—"]);
  const hudCount = el("b", {}, [`${levels.length} levels`]);
  const hudTop = el("div", { class: "stage-hud-top" }, [
    el("div", { class: "hud-chip" }, [engine.toUpperCase(), " STACK · ", hudLevel]),
    el("div", { class: "hud-chip" }, ["DEPTH ", hudCount, " · DRAG TO ORBIT"]),
  ]);
  stage.append(canvas, hudTop);

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
  let flyRaf = 0;
  let disposed = false;
  const data = { points: null };

  function show(level) {
    hudLevel.textContent = level.name;
    for (const button of rail.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", button.dataset.id === level.id ? "true" : "false");
    }
    const built = sceneFor(engine, level.id, materials);
    const facet = level.facets?.structure;
    const physics = level.facets?.physics;
    const trade = level.facets?.tradeoffs;
    sheet.replaceChildren(
      panel(
        level.name,
        [
          facet ? el("p", {}, [facet.text]) : null,
          physics && physics.text !== facet?.text ? note(`Physics: ${physics.text}`) : null,
          trade ? note(`Engineering trade-off: ${trade.text}`) : null,
          facet ? provCited({ status: facet.status, value: facet.text, source: facet.source || "" }) : null,
          note(built.note),
        ],
        null,
        `${engine.toUpperCase()} Taxonomy · ${level.id}`,
      ),
    );
    if (!view) return;
    if (flyRaf) {
      cancelAnimationFrame(flyRaf);
      flyRaf = 0;
      flying = false;
    }
    const previous = current;
    built.group.position.z = previous ? -26 : 0;
    view.root.add(built.group);
    current = built;
    if (!previous) {
      view.frame(built.group, 0.86);
      return;
    }
    flying = true;
    const start = performance.now();
    const step = (now) => {
      flyRaf = 0;
      if (disposed) return;
      const u = Math.min(1, (now - start) / 480);
      const eased = u * u * (3 - 2 * u);
      built.group.position.z = -26 * (1 - eased);
      previous.group.position.z = 22 * eased;
      view.invalidate({ shadows: true });
      if (u < 1) {
        flyRaf = requestAnimationFrame(step);
        return;
      }
      view.root.remove(previous.group);
      flying = false;
      view.frame(built.group, 0.86);
    };
    flyRaf = requestAnimationFrame(step);
  }

  for (const level of levels) {
    const button = el("button", { type: "button", dataset: { id: level.id } }, [
      level.name.replace(/\(.*\)/, "").slice(0, 26),
    ]);
    button.addEventListener("click", () => show(level));
    rail.append(button);
  }
  const featured = levels.find((level) => /cores|mc12|990/.test(level.id)) || levels[0];
  if (featured) show(featured);

  if (view) {
    view.setFrame(() => {
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
      disposed = true;
      if (flyRaf) cancelAnimationFrame(flyRaf);
      view?.dispose();
    },
  };
}
