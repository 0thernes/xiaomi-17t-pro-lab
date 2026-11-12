import { createAudio } from "./audio.js";
import { mountShell } from "./shell.js";
import { parseHash } from "./routes.js";
import { measureCapability } from "./quality.js";
import { el } from "./dom.js";

const audio = createAudio();
const shell = mountShell(audio);
const capability = measureCapability();

const loaders = {
  hub: () => import("./labs/hub.js"),
  zoom: () => import("./labs/zoom.js"),
  cpu: () => import("./labs/cpu.js"),
  gpu: () => import("./labs/gpu.js"),
  npu: () => import("./labs/npu.js"),
  litho: () => import("./labs/litho.js"),
  transistor: () => import("./labs/transistor.js"),
  compare: () => import("./labs/compare.js"),
};

let dispose = () => {};
let lastId = null;

async function show() {
  const route = parseHash(location.hash);
  dispose();
  dispose = () => {};
  shell.setActive(route.id);
  const main = shell.main;
  main.dataset.ready = "false";
  main.replaceChildren(el("p", { class: "status", role: "status" }, ["Loading this view…"]));
  const cap = { ...(await capability) };
  const forcedTier = new URLSearchParams(location.search).get("tier");
  if (forcedTier === "low" || forcedTier === "medium" || forcedTier === "high" || forcedTier === "ultra") {
    cap.tier = forcedTier;
    const { pixelRatioFor } = await import("./quality.js");
    cap.pixelRatio = pixelRatioFor(forcedTier);
  }
  try {
    const mod = await loaders[route.id]();
    const handle = await mod.mount(main, { cap, audio, route });
    if (handle?.dispose) dispose = handle.dispose;
    audio.blip("nav");
  } catch (error) {
    console.error(error);
    main.replaceChildren(
      el("h1", {}, ["This view failed"]),
      el("p", { class: "error" }, [error instanceof Error ? error.message : String(error)]),
      el("p", { class: "note" }, ["The failure is on this page. Other routes are separate modules."]),
    );
  }
  main.dataset.ready = "true";
  if (route.id !== lastId) {
    window.scrollTo(0, 0);
    const heading = main.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    lastId = route.id;
  }
}

window.addEventListener("hashchange", () => {
  void show();
});

if (!location.hash) history.replaceState(null, "", "#/");
void show();
