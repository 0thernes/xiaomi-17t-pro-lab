import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provComputed, provMeasured } from "../provenance.js";
import { dopri54, lorenzDeriv, rk4, robertsonDeriv, vanDerPolDeriv } from "../sim/ode.js";
import { makeMaterials, mountView } from "../graphics/view.js";
import * as THREE from "three";

export async function mount(main, { cap, route }) {
  const which = route.parts[0] || "game";
  const host = el("div");
  const tabs = el("div", { class: "level-rail" });
  for (const [id, label] of [
    ["game", "Game"],
    ["llm", "LLM"],
    ["life", "A-Life"],
    ["sci", "Science"],
    ["browser", "Browser"],
  ]) {
    const link = el("a", { class: "chip", href: `#/work/${id}`, "aria-current": which === id ? "true" : null }, [
      label,
    ]);
    tabs.append(link);
  }
  main.replaceChildren(
    el("h1", {}, ["Workloads"]),
    el("p", { class: "lede" }, [
      "These run in this browser, on the CPU and GPU the browser scheduled. None of them is dispatched to the NPU 990.",
    ]),
    tabs,
    host,
  );
  const dispose = await mountTab(host, which, cap);
  return { dispose: dispose || (() => {}) };
}

async function mountTab(host, which, cap) {
  if (which === "llm") return mountLlm(host);
  if (which === "life") return mountLife(host);
  if (which === "sci") return mountSci(host);
  if (which === "browser") return mountBrowser(host);
  return mountGame(host, cap);
}

async function mountGame(host, cap) {
  const stage = el("div", { class: "stage" });
  const canvas = el("canvas", { "aria-label": "Instanced 3D stress scene" });
  const readout = el("p", { class: "status" }, ["—"]);
  stage.append(canvas);
  host.replaceChildren(
    panel("Gaming stress", [
      note(
        "One instanced mesh. Draw calls stay in the tens. Frame time is measured here, not claimed as a 144 Hz phone mode.",
      ),
      stage,
      readout,
    ]),
  );
  let view;
  try {
    view = await mountView(canvas, cap);
  } catch (error) {
    readout.textContent = error.message;
    return () => {};
  }
  const count = cap.tier === "low" ? 80 : cap.tier === "ultra" ? 1400 : cap.tier === "high" ? 700 : 280;
  const geo = new THREE.IcosahedronGeometry(0.35, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.35, metalness: 0.4 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 16;
    const y = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 10;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    seeds.push({ x, y, z, p: Math.random() * 6 });
  }
  view.root.add(mesh);
  view.look(22);
  view.setFrame((now) => {
    const t = now * 0.001;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      dummy.position.set(s.x, s.y + Math.sin(t + s.p) * 0.4, s.z);
      dummy.rotation.set(t + s.p, t * 0.4, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    readout.textContent = `${view.frameMs.toFixed(1)} ms · ${count} instances · 1 instanced draw`;
  });
  return () => view.dispose();
}

function mountLlm(host) {
  const out = el("p", { class: "status" }, ["Weights are vendored. Generation starts when you ask."]);
  const button = el("button", { type: "button", class: "primary" }, ["Generate"]);
  const log = el("pre", { class: "mono" }, ["Once upon a time"]);
  button.addEventListener("click", async () => {
    button.disabled = true;
    out.textContent = "Loading the float16 TinyStories-8M checkpoint…";
    const t0 = performance.now();
    const { parseSafetensors } = await import("../workloads/safetensors.js");
    const { buildWeights, greedyTokens } = await import("../workloads/gpt-neo.js");
    const { GPT2Tokenizer } = await import("../workloads/tokenizer.js");
    const base = new URL("../../vendor/tinystories/", import.meta.url);
    const [buf, vocab, merges] = await Promise.all([
      fetch(new URL("model.f16.safetensors", base)).then((r) => r.arrayBuffer()),
      fetch(new URL("vocab.json", base)).then((r) => r.json()),
      fetch(new URL("merges.txt", base)).then((r) => r.text()),
    ]);
    const weights = buildWeights(parseSafetensors(buf).tensors);
    const tokenizer = new GPT2Tokenizer(vocab, merges);
    const prompt = "Once upon a time";
    const ids = tokenizer.encode(prompt);
    const genT = performance.now();
    const produced = greedyTokens(weights, ids, 8);
    const seconds = (performance.now() - genT) / 1000;
    log.textContent = prompt + tokenizer.decode(produced);
    out.textContent = `${fmt(produced.length / seconds, 3)} tokens/s greedy after load (${fmt((performance.now() - t0) / 1000, 3)} s including weights). JavaScript, not the NPU.`;
    button.disabled = false;
  });
  host.replaceChildren(
    panel("TinyStories-8M", [
      note(
        "Port of the GPT-Neo forward used by Neuralese (MIT). Weights are roneneldan/TinyStories-8M, packed from the pinned F32 file to float16. This is the CPU in this browser.",
      ),
      button,
      out,
      log,
      kv("Claim", el("span", {}, ["not the NPU ", provComputed("no WebNN / NeuroPilot dispatch")])),
    ]),
  );
  return () => {};
}

async function mountLife(host) {
  const canvas = el("canvas", { width: "320", height: "320", "aria-label": "Glitchling foraging" });
  const status = el("p", { class: "status" }, ["Loading the vendored play sim…"]);
  host.replaceChildren(
    panel("Glitchling", [
      note(
        "The browser play sim from glitchling-jam, vendored with its header. It is the simplified port, not the TypeScript reference. Asmodenius is not in cosmogonic-quantum-mechalogodrom at b0dcf15. CQM’s Super Creature stays in that repo under the Cosmogonic license and is not re-shipped here.",
      ),
      canvas,
      status,
    ]),
  );
  const code = await fetch(new URL("../../vendor/glitchling/sim.js", import.meta.url)).then((r) => r.text());
  const run = new Function(`${code}; return globalThis.GL;`);
  const GL = run();
  const creature = new GL.Glitchling(1, GL.DEFAULT_FLAWS);
  const ctx = canvas.getContext("2d");
  let alive = true;
  function frame() {
    if (!alive) return;
    for (let i = 0; i < 4; i++) creature.step();
    ctx.fillStyle = "#100e0c";
    ctx.fillRect(0, 0, 320, 320);
    for (let k = 0; k < GL.SITES; k++) {
      const p = GL.SITE_POS[k];
      ctx.fillStyle = k === creature.best ? "#ff7a1a" : "#3a312b";
      ctx.beginPath();
      ctx.arc(p.x * 320, p.y * 320, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f6efe6";
    ctx.beginPath();
    ctx.arc(creature.pos.x * 320, creature.pos.y * 320, 8, 0, Math.PI * 2);
    ctx.fill();
    status.textContent = `tick ${creature.t} foraged ${creature.foraged} rewards ${creature.rewards} glucose ${creature.glc.toFixed(2)}`;
    requestAnimationFrame(frame);
  }
  frame();
  return () => {
    alive = false;
  };
}

function mountSci(host) {
  const lorenz = rk4(lorenzDeriv(), [1, 1, 1], { t1: 2, dt: 0.01 });
  const stiff = dopri54(robertsonDeriv, [1, 0, 0], { t1: 1, dt: 0.01, tol: 1e-5 });
  const vdp = dopri54(vanDerPolDeriv(8), [2, 0], { t1: 5, dt: 0.05, tol: 1e-4 });
  host.replaceChildren(
    panel("Differential equations", [
      note(
        "RK4 and Dormand–Prince 5(4), written for this page. Lorenz is the chaotic case. Robertson is the stiff case. The ideas sit next to moonlab, tsotchke-chaos, eshkol, and the PINN work; those solvers are not copied.",
      ),
      kv(
        "Lorenz RK4",
        el("span", {}, [
          `${lorenz.steps} steps, y0=${fmt(lorenz.y[0], 4)} `,
          provComputed("classic RK4, dt=0.01, t=2"),
        ]),
      ),
      kv(
        "Robertson DOPRI",
        el("span", {}, [
          `${stiff.accepted} accepted / ${stiff.steps} tries, y1=${fmt(stiff.y[0], 4)} `,
          provComputed("Dormand–Prince 5(4), tol 1e-5"),
        ]),
      ),
      kv(
        "Van der Pol",
        el("span", {}, [`${vdp.accepted} accepted, y=${fmt(vdp.y[0], 4)} `, provComputed("μ=8, adaptive")]),
      ),
      kv("Measured", el("span", {}, ["the step counts above ", provMeasured("this JavaScript process")])),
    ]),
  );
  return () => {};
}

function mountBrowser(host) {
  const frame = el("div", { class: "panel" });
  const bar = el("p", { class: "mono" }, ["gigachad://local/stream"]);
  const body = el("div");
  function open(url, node) {
    bar.textContent = url;
    body.replaceChildren(node);
  }
  const pages = el("div", { class: "level-rail" }, [
    el(
      "button",
      {
        type: "button",
        onClick: () =>
          open(
            "gigachad://local/stream",
            note("A phone browser can time a typed-array triad. This shell does not fetch the network."),
          ),
      },
      ["Stream"],
    ),
    el(
      "button",
      {
        type: "button",
        onClick: () =>
          open(
            "gigachad://local/life",
            note(
              "Glitchling is a local page. The full Gigachad browser is a different repository and is not embedded.",
            ),
          ),
      },
      ["Life"],
    ),
    el(
      "button",
      {
        type: "button",
        onClick: () =>
          open(
            "gigachad://local/limits",
            note("No extension process, no multi-process sandbox, no NPU delegate. USB on this phone is 2.0."),
          ),
      },
      ["Limits"],
    ),
  ]);
  frame.append(bar, pages, body);
  open(
    "gigachad://local/stream",
    note(
      "Concept shell adapted to what this page can run. Source idea: github.com/0thernes/gigachad-browser. The 1.5 MB application is not vendored.",
    ),
  );
  host.replaceChildren(panel("Gigachad, phone-scale", [frame]));
  return () => {};
}
