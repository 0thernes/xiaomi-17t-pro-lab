import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provComputed, provMeasured } from "../provenance.js";
import { dopri54, lorenzDeriv, rk4Step, robertsonDeriv, vanDerPolDeriv } from "../sim/ode.js";
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
        "One instanced mesh of this page. The millisecond figure is the live requestAnimationFrame interval. It is not a game and it is not a 144 Hz claim.",
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
  const history = [];
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
    history.push(view.frameMs);
    if (history.length > 48) history.shift();
    const min = Math.min(...history);
    const max = Math.max(...history);
    readout.textContent = `live ${view.frameMs.toFixed(1)} ms · last ${history.length} frames ${min.toFixed(1)}–${max.toFixed(1)} ms · ${count} instances · 1 instanced draw`;
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
    const trace = [];
    const produced = greedyTokens(weights, ids, 8, trace);
    const seconds = (performance.now() - genT) / 1000;
    log.textContent = [
      prompt,
      ...produced.map((id, i) => `${tokenizer.decode([id])}   ${trace[i].toFixed(2)} ms`),
    ].join("\n");
    out.textContent = `${fmt(produced.length / seconds, 3)} tokens/s over the greedy loop (${fmt(seconds, 3)} s, load ${fmt((performance.now() - t0) / 1000, 3)} s). Each line is one argmax timed inside that loop. Not a server stream. Not the NPU.`;
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
  const trail = [];
  let alive = true;
  function frame() {
    if (!alive) return;
    for (let i = 0; i < 4; i++) creature.step();
    trail.push(creature.pos.x, creature.pos.y);
    if (trail.length > 48) trail.splice(0, 2);
    ctx.fillStyle = "#100e0c";
    ctx.fillRect(0, 0, 320, 320);
    for (let k = 0; k < GL.SITES; k++) {
      const p = GL.SITE_POS[k];
      ctx.fillStyle = k === creature.best ? "#ff7a1a" : "#3a312b";
      ctx.beginPath();
      ctx.arc(p.x * 320, p.y * 320, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#f6efe6";
    ctx.beginPath();
    for (let i = 0; i < trail.length; i += 2) {
      const x = trail[i] * 320;
      const y = trail[i + 1] * 320;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#f6efe6";
    ctx.beginPath();
    ctx.arc(creature.pos.x * 320, creature.pos.y * 320, 8, 0, Math.PI * 2);
    ctx.fill();
    status.textContent = `live · 4 step() calls this frame · tick ${creature.t} foraged ${creature.foraged} rewards ${creature.rewards} glucose ${creature.glc.toFixed(2)}`;
    requestAnimationFrame(frame);
  }
  frame();
  return () => {
    alive = false;
  };
}

function mountSci(host) {
  const status = el("p", { class: "status" }, ["Integrating Lorenz with RK4…"]);
  const canvas = el("canvas", { width: "640", height: "280", "aria-label": "Live Lorenz trajectory from RK4" });
  const rest = el("div");
  host.replaceChildren(
    panel("Differential equations", [
      note(
        "RK4 and Dormand–Prince 5(4), written for this page. The curve is this tab’s own steps, drawn as they are accepted. Lorenz runs first. Robertson and Van der Pol run when it finishes. The ideas sit next to moonlab, tsotchke-chaos, eshkol, and the PINN work; those solvers are not copied.",
      ),
      canvas,
      status,
      rest,
    ]),
  );
  const deriv = lorenzDeriv();
  let y = new Float64Array([1, 1, 1]);
  let t = 0;
  const dt = 0.01;
  const t1 = 8;
  const pts = [];
  const ctx = canvas.getContext("2d");
  let alive = true;
  let finished = false;
  function draw() {
    ctx.fillStyle = "#100e0c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (pts.length < 2) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minZ) minZ = p[1];
      if (p[1] > maxZ) maxZ = p[1];
    }
    const pad = 16;
    const sx = maxX - minX || 1;
    const sz = maxZ - minZ || 1;
    ctx.strokeStyle = "#ff7a1a";
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = pad + ((pts[i][0] - minX) / sx) * (canvas.width - pad * 2);
      const z = pad + ((pts[i][1] - minZ) / sz) * (canvas.height - pad * 2);
      if (i === 0) ctx.moveTo(x, z);
      else ctx.lineTo(x, z);
    }
    ctx.stroke();
  }
  function frame() {
    if (!alive) return;
    if (t < t1) {
      for (let i = 0; i < 6 && t < t1; i++) {
        y = rk4Step(deriv, y, t, dt);
        t += dt;
        pts.push([y[0], y[2]]);
      }
      draw();
      status.textContent = `Lorenz RK4 live. t=${t.toFixed(2)} / ${t1}, ${pts.length} steps, dt=${dt}. x versus z. This tab, not a recording.`;
      requestAnimationFrame(frame);
      return;
    }
    if (!finished) {
      finished = true;
      const stiff = dopri54(robertsonDeriv, [1, 0, 0], { t1: 1, dt: 0.01, tol: 1e-5 });
      const vdp = dopri54(vanDerPolDeriv(8), [2, 0], { t1: 5, dt: 0.05, tol: 1e-4 });
      status.textContent = `Lorenz RK4 finished. ${pts.length} steps, y0=${y[0].toFixed(4)}. Robertson and Van der Pol ran in this turn.`;
      rest.replaceChildren(
        kv(
          "Robertson DOPRI",
          el("span", {}, [
            `${stiff.accepted} accepted / ${stiff.steps} tries, y1=${fmt(stiff.y[0], 4)} `,
            provComputed("Dormand–Prince 5(4), tol 1e-5, after Lorenz"),
          ]),
        ),
        kv(
          "Van der Pol",
          el("span", {}, [
            `${vdp.accepted} accepted, y=${fmt(vdp.y[0], 4)} `,
            provComputed("μ=8, adaptive, after Lorenz"),
          ]),
        ),
        kv("Measured", el("span", {}, ["the counts above ", provMeasured("this JavaScript process")])),
      );
    }
  }
  frame();
  return () => {
    alive = false;
  };
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
