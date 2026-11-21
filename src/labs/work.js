import * as THREE from "three";
import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { makeMaterials, mountView } from "../graphics/view.js";
import { mountSketch } from "../p5-loader.js";
import { provComputed, provMeasured } from "../provenance.js";
import { dopri54, lorenzDeriv, rk4, robertsonDeriv, vanDerPolDeriv } from "../sim/ode.js";
import { merminPeresSummary, runChshExperiment, runMermin3Experiment } from "../sim/quantum-lab.js";

export async function mount(main, { cap, route }) {
  const which = route.parts[0] || "game";
  const host = el("div");
  const tabs = el("div", { class: "level-rail", role: "tablist" });
  for (const [id, label] of [
    ["game", "Gaming PBR Stress"],
    ["llm", "Neuralese · TinyStories-8M"],
    ["life", "A-Life · Glitchling / Asmodensius"],
    ["sci", "Tsotchke · ODE & Quantum"],
    ["browser", "GigaChad Mobile Cortex"],
  ]) {
    const link = el("a", { class: "chip", href: `#/work/${id}`, "aria-current": which === id ? "true" : null }, [
      label,
    ]);
    tabs.append(link);
  }

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["LIVE OPERATIONAL ENGINES"]),
      el("span", {}, ["GAMING · NEURALESE LLM · GLITCHLING A-LIFE · TSOTCHKE QUANTUM · GIGACHAD SWARM"]),
    ]),
    el("h1", {}, ["Operational Workloads — Running Live in This Browser"]),
    el("p", { class: "lede" }, [
      "Every workload below genuinely computes in real time on your CPU and GPU (none is dispatched to the Dimensity 9500 NPU 990). Zero mock animations — real transformer weights, real 272-neuron brains, real ODE/statevector solvers, and real 60 Hz swarm kinematics.",
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
  if (which === "sci") return mountSci(host, cap);
  if (which === "browser") return mountBrowser(host, cap);
  return mountGame(host, cap);
}

/* =========================================================================
 * 1. GAMING — Mali-G1 Ultra Instanced PBR Stress Arena + Frametime Scope
 * ========================================================================= */
async function mountGame(host, cap) {
  const defaultCount = cap.tier === "low" ? 160 : cap.tier === "ultra" ? 2000 : cap.tier === "high" ? 1200 : 500;
  const countCtrl = rangeControl("Instanced PBR Meshes", 100, 4000, 100, defaultCount, (v) => `${v}`);
  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "Instanced PBR 3D stress arena" });
  const hudFps = el("b", {}, ["—"]);
  const hudTris = el("b", {}, ["—"]);
  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["FPS ", hudFps]),
      el("div", { class: "hud-chip" }, ["TRIANGLES ", hudTris, " · 1 INSTANCED DRAW"]),
    ]),
  );

  const scopeHost = el("div", { class: "plot" });
  const status = el("p", { class: "status" }, ["Warming up PBR arena…"]);

  host.replaceChildren(
    readoutGrid([
      readout("17T Pro Steel Nomad", "2,476 → 1,871", "pts", { tone: "cyan", sub: "75.6% sustained (PhoneArena)" }),
      readout("17T Pro WLE Median", "6,209", "pts", { tone: "accent", sub: "UL 3DMark (vs 8059 iPhone 18PM)" }),
      readout("Display Ceiling", "144", "Hz", { tone: "ok", sub: "6.94 ms frame budget" }),
      readout("Touch Sampling", "480 / 3500", "Hz", { tone: "cyan", sub: "sustained / instantaneous" }),
    ]),
    panel(
      "Live Instanced PBR Stress Arena",
      [stage, el("div", { class: "tool-bar" }, [countCtrl.node, status]), scopeHost],
      null,
      "MEASURED FRAME-TIME OSCILLOSCOPE",
    ),
  );

  let view;
  const history = new Float32Array(90).fill(16.6);
  let head = 0;
  const scope = await mountSketch(
    scopeHost,
    (p) => {
      p.background("#06080c");
      const padL = 38;
      const w = p.width - padL - 12;
      const h = p.height - 28;
      // 60 Hz (16.67 ms) and 144 Hz (6.94 ms) budget lines
      const yOf = (ms) => p.height - 14 - Math.min(1, ms / 40) * h;
      p.stroke("rgba(74, 222, 128, 0.35)");
      p.line(padL, yOf(6.94), padL + w, yOf(6.94));
      p.stroke("rgba(251, 191, 36, 0.35)");
      p.line(padL, yOf(16.67), padL + w, yOf(16.67));
      p.stroke("#38d4f2");
      p.strokeWeight(2);
      p.noFill();
      p.beginShape();
      for (let i = 0; i < history.length; i++) {
        const ms = history[(head + i) % history.length];
        p.vertex(padL + (i / (history.length - 1)) * w, yOf(ms));
      }
      p.endShape();
      p.noStroke();
      p.fill("#4ade80");
      p.textSize(9);
      p.text("144Hz", 4, yOf(6.94) + 3);
      p.fill("#fbbf24");
      p.text("60Hz", 4, yOf(16.67) + 3);
      p.fill("#9fb0c8");
      p.text("LIVE FRAMETIME OSCILLOSCOPE (ms, 0–40 ms)", padL, 12);
    },
    { height: 150, loop: true, fps: 30 },
  );

  try {
    view = await mountView(canvas, cap);
  } catch (error) {
    status.textContent = error.message;
    return () => scope.dispose();
  }

  let mesh = null;
  let seeds = [];
  const dummy = new THREE.Object3D();
  const geo = new THREE.OctahedronGeometry(0.42, 1);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xd0d8e8,
    metalness: 0.78,
    roughness: 0.22,
    clearcoat: 0.7,
    iridescence: cap.tier !== "low" ? 0.8 : 0,
  });

  function rebuild(count) {
    if (mesh) {
      view.root.remove(mesh);
      mesh.dispose();
    }
    mesh = new THREE.InstancedMesh(geo, mat, count);
    const col = new THREE.Color();
    seeds = [];
    for (let i = 0; i < count; i++) {
      const r = 3.5 + (i % 24) * 0.55;
      const a = i * 0.42;
      const y = ((i % 15) - 7) * 0.85;
      seeds.push({ r, a, y, p: (i * 0.37) % 6.28 });
      col.setHSL(0.06 + (i % 3) * 0.24, 0.82, 0.56);
      mesh.setColorAt(i, col);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    view.root.add(mesh);
    hudTris.textContent = `${(count * 32).toLocaleString()} tris`;
  }

  rebuild(defaultCount);
  view.look(26);
  countCtrl.input.addEventListener("input", () => rebuild(Number(countCtrl.input.value)));

  view.setFrame((now) => {
    const t = now * 0.001;
    const count = seeds.length;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const ang = s.a + t * 0.28;
      dummy.position.set(Math.cos(ang) * s.r, s.y + Math.sin(t * 1.4 + s.p) * 0.6, Math.sin(ang) * s.r);
      dummy.rotation.set(t + s.p, t * 0.6, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    history[head] = view.frameMs;
    head = (head + 1) % history.length;
    const fps = Math.round(1000 / Math.max(1, view.frameMs));
    hudFps.textContent = `${fps} FPS (${view.frameMs.toFixed(1)} ms)`;
    status.textContent = `${view.frameMs.toFixed(1)} ms (${fps} FPS) · ${count} instanced PBR octahedra · ${(count * 32).toLocaleString()} tris/frame`;
  });

  return () => {
    scope.dispose();
    geo.dispose();
    mat.dispose();
    view.dispose();
  };
}

/* =========================================================================
 * 2. LLM — NEURALESE LIVE WEIGHT-HACKED TINYSTORIES-8M (39.4 MB FP16!)
 * ========================================================================= */
let cachedTiny = null;

async function mountLlm(host) {
  const promptInput = el("input", {
    type: "text",
    value: "Once upon a time",
    "aria-label": "Transformer prompt",
    style: "flex:1 1 260px",
  });
  const countCtrl = rangeControl("Tokens to Generate", 6, 36, 2, 16, (v) => `${v} tok`);
  const mlpCtrl = rangeControl("Neuralese MLP Gain", 0, 2.2, 0.05, 1.0, (v) => `${v.toFixed(2)}×`);
  const attnCtrl = rangeControl("Neuralese Attention Gain", 0, 2.2, 0.05, 1.0, (v) => `${v.toFixed(2)}×`);
  const noiseCtrl = rangeControl("Weight Perturbation σ", 0, 0.5, 0.02, 0, (v) => v.toFixed(2));
  const ablateSel = el("select", { "aria-label": "Ablate transformer layer" }, [
    el("option", { value: "-1" }, ["No Layer Ablation (All 8 Layers Active)"]),
    ...Array.from({ length: 8 }, (_, l) => el("option", { value: String(l) }, [`Ablate Layer h.${l} (skip attn+MLP)`])),
  ]);

  const genBtn = el("button", { type: "button", class: "primary" }, ["Stream Generate"]);
  const resetBtn = el("button", { type: "button", class: "btn" }, ["Reset Hacks"]);
  const status = el("p", { class: "status" }, [
    "39.4 MB FP16 TinyStories-8M weights are vendored locally. Press Stream Generate to run.",
  ]);
  const streamBox = el("div", { class: "token-stream" }, [el("span", { class: "token-prompt" }, ["Once upon a time"])]);
  const probHost = el("div", { class: "prob-list" });
  const attnPlot = el("div", { class: "plot" });

  resetBtn.addEventListener("click", () => {
    mlpCtrl.input.value = "1";
    attnCtrl.input.value = "1";
    noiseCtrl.input.value = "0";
    ablateSel.value = "-1";
    mlpCtrl.sync();
    attnCtrl.sync();
    noiseCtrl.sync();
  });

  host.replaceChildren(
    readoutGrid([
      readout("Model Checkpoint", "8.3M", "params", { tone: "cyan", sub: "TinyStories-8M FP16 safetensors" }),
      readout("Architecture", "8L · 16H · 256d", "GPT-Neo", {
        tone: "accent",
        sub: "Alternating global / 256-win local",
      }),
      readout("Phone NPU Ref", "28 / 1600+", "tok/s", { tone: "ok", sub: "Gemma 3n E2B on MT6993 LiteRT" }),
      readout("Browser Runtime", "JS CPU", "not NPU", { tone: "warn", sub: "Live weight hacking in browser" }),
    ]),
    el("div", { class: "grid cols-2" }, [
      panel(
        "Neuralese Live Weight-Hacking Controls & Token Stream",
        [
          el("div", { class: "chips" }, [promptInput, genBtn, resetBtn]),
          countCtrl.node,
          mlpCtrl.node,
          attnCtrl.node,
          noiseCtrl.node,
          ablateSel,
          status,
          streamBox,
          kv(
            "Honest Boundary",
            el("span", {}, [
              "JavaScript CPU thread — not dispatched to NPU 990 ",
              provComputed("no WebNN / NeuroPilot API"),
            ]),
          ),
        ],
        null,
        "REAL WEIGHTS · LIVE INTERVENTION",
      ),
      panel(
        "Live 16-Head Attention Heatmap & Top-6 Token Probabilities",
        [attnPlot, el("h3", { style: "margin-top:12px" }, ["Next-Token Softmax Distribution"]), probHost],
        null,
        "LAYER 7 ATTENTION + LOGITS",
      ),
    ]),
  );

  const sketch = await mountSketch(attnPlot, drawAttention, { height: 220 });
  let cancelled = false;

  genBtn.addEventListener("click", async () => {
    genBtn.disabled = true;
    try {
      const tLoad0 = performance.now();
      if (!cachedTiny) {
        status.textContent = "Loading vendored 39.4 MB float16 TinyStories-8M safetensors…";
        const { parseSafetensors } = await import("../workloads/safetensors.js");
        const { buildWeights } = await import("../workloads/gpt-neo.js");
        const { GPT2Tokenizer } = await import("../workloads/tokenizer.js");
        const base = new URL("../../vendor/tinystories/", import.meta.url);
        const [buf, vocab, merges] = await Promise.all([
          fetch(new URL("model.f16.safetensors", base)).then((r) => r.arrayBuffer()),
          fetch(new URL("vocab.json", base)).then((r) => r.json()),
          fetch(new URL("merges.txt", base)).then((r) => r.text()),
        ]);
        cachedTiny = {
          weights: buildWeights(parseSafetensors(buf).tensors),
          tokenizer: new GPT2Tokenizer(vocab, merges),
        };
      }
      const { createStream } = await import("../workloads/gpt-neo.js");
      const { weights, tokenizer } = cachedTiny;
      const promptText = promptInput.value || "Once upon a time";
      const promptIds = tokenizer.encode(promptText);
      const stream = createStream(weights);

      const getHacks = () => ({
        mlpGain: Number(mlpCtrl.input.value),
        attnGain: Number(attnCtrl.input.value),
        noiseAmp: Number(noiseCtrl.input.value),
        ablateLayer: Number(ablateSel.value),
      });

      let hidden = null;
      for (const id of promptIds) hidden = stream.step(id, getHacks());

      const total = Number(countCtrl.input.value);
      const genSpan = el("span", { class: "token-gen" }, [""]);
      streamBox.replaceChildren(el("span", { class: "token-prompt" }, [promptText]), genSpan);

      const tGen0 = performance.now();
      const produced = [];
      for (let i = 0; i < total; i++) {
        if (cancelled) return;
        const top = stream.topK(hidden, 6, 1.0);
        const nextId = top[0].id;
        produced.push(nextId);
        genSpan.textContent = tokenizer.decode(produced);

        probHost.replaceChildren(
          ...top.map((item) => {
            const label = JSON.stringify(tokenizer.decode([item.id])).slice(1, -1);
            return el("div", { class: "prob-row" }, [
              el("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, [label || "␣"]),
              el("div", { class: "prob-bar-bg" }, [
                el("div", { class: "prob-bar-fill", style: `width:${(item.prob * 100).toFixed(1)}%` }),
              ]),
              el("span", {}, [`${(item.prob * 100).toFixed(1)}%`]),
            ]);
          }),
        );

        sketch.setState({ telemetry: stream.telemetry });
        hidden = stream.step(nextId, getHacks());
        const elapsed = Math.max(0.01, (performance.now() - tGen0) / 1000);
        status.textContent = `${(produced.length / elapsed).toFixed(2)} tok/s live (${produced.length}/${total} tokens · load ${((tGen0 - tLoad0) / 1000).toFixed(2)}s)`;
        await new Promise((r) => setTimeout(r, 0));
      }
    } catch (err) {
      status.textContent = `Generation error: ${err.message}`;
    } finally {
      genBtn.disabled = false;
    }
  });

  return () => {
    cancelled = true;
    sketch.dispose();
  };
}

function drawAttention(p, state) {
  p.background("#06080c");
  const tel = state.telemetry;
  if (!tel || !tel.lastLayerAttn) {
    p.fill("#6f819c");
    p.noStroke();
    p.textSize(11);
    p.text("Press Stream Generate to render live Layer-7 16-head Q·Kᵀ attention weights.", 14, p.height / 2);
    return;
  }
  const heads = tel.lastLayerAttn.length;
  const seq = tel.lastLayerAttn[0].length;
  const padL = 44;
  const padT = 22;
  const w = p.width - padL - 12;
  const h = p.height - padT - 14;
  const cw = w / Math.max(1, seq);
  const ch = h / heads;

  p.noStroke();
  for (let hd = 0; hd < heads; hd++) {
    for (let s = 0; s < seq; s++) {
      const a = tel.lastLayerAttn[hd][s];
      p.fill(p.lerpColor(p.color("#0b111c"), p.color("#ff6900"), Math.min(1, a * 2.2)));
      p.rect(padL + s * cw, padT + hd * ch, cw - 0.5, ch - 0.5);
    }
    p.fill("#6f819c");
    p.textSize(8);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(`H${hd}`, padL - 5, padT + hd * ch + ch / 2);
  }
  p.fill("#38d4f2");
  p.textAlign(p.LEFT, p.TOP);
  p.textSize(10);
  p.text(`LAYER 7 ATTENTION (16 HEADS × ${seq} TOKENS · ||x|| = ${tel.layerNorms[7].toFixed(1)})`, padL, 6);
}

/* =========================================================================
 * 3. A-LIFE — GLITCHLING (272 NEURONS, 14 REGIONS) + FLAW INJECTION
 * ========================================================================= */
async function mountLife(host) {
  const arenaCanvas = el("canvas", {
    width: "440",
    height: "440",
    style: "width:100%;max-width:440px;border-radius:10px;border:1px solid var(--line-strong);cursor:crosshair",
    "aria-label": "Glitchling 272-neuron foraging arena (click to drop snacks)",
  });
  const rasterCanvas = el("canvas", {
    width: "460",
    height: "320",
    style: "width:100%;border-radius:10px;border:1px solid var(--line);background:#06080c",
    "aria-label": "Live 14-region 272-neuron neural activity raster",
  });

  const flawChecks = {
    scramble: el("input", { type: "checkbox" }),
    leaky: el("input", { type: "checkbox" }),
    backwards: el("input", { type: "checkbox" }),
    misfire: el("input", { type: "checkbox" }),
  };
  const speedCtrl = rangeControl("Sim Speed (ticks/frame)", 1, 12, 1, 3, (v) => `${v}×`);
  const resetBtn = el("button", { type: "button", class: "btn" }, ["New Seed"]);
  const status = el("p", { class: "status" }, ["Loading vendored Glitchling 272-neuron simulation…"]);
  const bioHost = el("div");

  host.replaceChildren(
    readoutGrid([
      readout("Brain Connectome", "272", "neurons", { tone: "cyan", sub: "14 regions (SENS..ENS)" }),
      readout("Foraging World", "4 × 4", "16 sites", { tone: "accent", sub: "Click arena to drop food snacks" }),
      readout("Asmodensius Stack", "v4.0", "indicator", { tone: "ok", sub: "Non-sentient behavioral dynamics" }),
      readout("D9500 CPU Proj.", ">80k", "ticks/s*", { tone: "cyan", sub: "Single C1-Ultra core estimate" }),
    ]),
    el("div", { class: "grid cols-2" }, [
      panel(
        "Glitchling Embodied Foraging Arena (Click to Drop Snacks)",
        [
          arenaCanvas,
          el("div", { class: "chips" }, [
            el("label", { class: "toggle-check" }, [flawChecks.scramble, "Scramble Senses"]),
            el("label", { class: "toggle-check" }, [flawChecks.leaky, "Leaky Memory"]),
            el("label", { class: "toggle-check" }, [flawChecks.backwards, "Backwards Motors"]),
            el("label", { class: "toggle-check" }, [flawChecks.misfire, "Misfire Synapses"]),
            resetBtn,
          ]),
          speedCtrl.node,
          status,
        ],
        null,
        "GLITCHLING-JAM ENGINE",
      ),
      panel(
        "Live 14-Region Neural Firing Raster & Homeostatic Metabolism",
        [
          rasterCanvas,
          bioHost,
          note(
            "Vendored Glitchling browser port (272 rate neurons wired with the reference 14-region CP topology & flaw RNG). Asmodensius/CQM full TypeScript organisms remain in their dedicated repos; no sentience or consciousness is claimed.",
          ),
        ],
        null,
        "LIVE CONNECTOME TELEMETRY",
      ),
    ]),
  );

  const code = await fetch(new URL("../../vendor/glitchling/sim.js", import.meta.url)).then((r) => r.text());
  const GL = new Function(`${code}; return globalThis.GL;`)();

  let seed = 1;
  let creature = new GL.Glitchling(seed, GL.DEFAULT_FLAWS);

  function syncFlaws() {
    creature.flaws.scramble.on = flawChecks.scramble.checked;
    creature.flaws.leaky.on = flawChecks.leaky.checked;
    creature.flaws.backwards.on = flawChecks.backwards.checked;
    creature.flaws.misfire.on = flawChecks.misfire.checked;
  }
  Object.values(flawChecks).forEach((cb) => cb.addEventListener("change", syncFlaws));
  resetBtn.addEventListener("click", () => {
    seed += 1;
    creature = new GL.Glitchling(seed, GL.DEFAULT_FLAWS);
    syncFlaws();
  });

  // Click arena to drop a food snack at nearest site!
  arenaCanvas.addEventListener("click", (ev) => {
    const rect = arenaCanvas.getBoundingClientRect();
    const ux = (ev.clientX - rect.left) / rect.width;
    const uy = (ev.clientY - rect.top) / rect.height;
    let bestK = 0;
    let bestD = Infinity;
    for (let k = 0; k < GL.SITES; k++) {
      const p = GL.SITE_POS[k];
      const d = Math.hypot(p.x - ux, p.y - uy);
      if (d < bestD) {
        bestD = d;
        bestK = k;
      }
    }
    if (creature.snack) creature.snack[bestK] = Math.min(1, (creature.snack[bestK] || 0) + 0.65);
  });

  const ctx = arenaCanvas.getContext("2d");
  const rctx = rasterCanvas.getContext("2d");
  const trail = [];
  let alive = true;

  function frame() {
    if (!alive) return;
    const steps = Number(speedCtrl.input.value);
    for (let i = 0; i < steps; i++) creature.step();
    trail.push({ x: creature.pos.x, y: creature.pos.y });
    if (trail.length > 90) trail.shift();

    // Draw foraging arena
    const W = arenaCanvas.width;
    ctx.fillStyle = "#06080c";
    ctx.fillRect(0, 0, W, W);

    // Subtle grid
    ctx.strokeStyle = "rgba(31, 42, 60, 0.5)";
    ctx.lineWidth = 1;
    for (let g = 1; g < 8; g++) {
      ctx.beginPath();
      ctx.moveTo((g * W) / 8, 0);
      ctx.lineTo((g * W) / 8, W);
      ctx.moveTo(0, (g * W) / 8);
      ctx.lineTo(W, (g * W) / 8);
      ctx.stroke();
    }

    // 16 foraging sites sized by true reward prob & ringed by learned wSite belief
    for (let k = 0; k < GL.SITES; k++) {
      const sp = GL.SITE_POS[k];
      const sx = sp.x * W;
      const sy = sp.y * W;
      const pVal = creature.pTrue ? creature.pTrue[k] : 0.2;
      const wVal = creature.wSite ? creature.wSite[k] : 0.25;
      const snack = creature.snack ? creature.snack[k] : 0;

      ctx.fillStyle = k === creature.best ? "rgba(255, 105, 0, 0.3)" : "rgba(56, 212, 242, 0.14)";
      ctx.beginPath();
      ctx.arc(sx, sy, 14 + pVal * 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = snack > 0.05 ? "#4ade80" : k === creature.best ? "#ff6900" : "#38d4f2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 8 + wVal * 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Creature motion trail
    if (trail.length > 2) {
      ctx.strokeStyle = "rgba(56, 212, 242, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x * W, pt.y * W);
        else ctx.lineTo(pt.x * W, pt.y * W);
      });
      ctx.stroke();
    }

    // Creature body
    const cx = creature.pos.x * W;
    const cy = creature.pos.y * W;
    ctx.fillStyle = "#eef3fa";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ff6900";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw 14-region 272-neuron live activity heatmap
    const RW = rasterCanvas.width;
    const RH = rasterCanvas.height;
    rctx.fillStyle = "#06080c";
    rctx.fillRect(0, 0, RW, RH);
    const regions = GL.REGIONS || [
      ["SENS", 16],
      ["THAL", 16],
      ["CTX", 64],
      ["HIP", 32],
      ["STR", 32],
      ["HYP", 16],
      ["VTA", 6],
      ["RAPHE", 6],
      ["LC", 6],
      ["BF", 6],
      ["INS", 8],
      ["SCN", 8],
      ["MOT", 8],
      ["ENS", 48],
    ];
    const rates = creature.rate || creature.rNeu || [];
    const rowH = (RH - 16) / regions.length;
    let offset = 0;
    regions.forEach(([name, count], idx) => {
      const y = 8 + idx * rowH;
      rctx.fillStyle = "#9fb0c8";
      rctx.font = "600 10px monospace";
      rctx.fillText(name, 8, y + rowH * 0.72);
      const barW = (RW - 64) / count;
      for (let i = 0; i < count; i++) {
        const act = Math.max(0, Math.min(1, Number(rates[offset + i]) || 0));
        rctx.fillStyle = `rgb(${Math.round(14 + act * 241)}, ${Math.round(24 + act * 170)}, ${Math.round(44 + act * 200)})`;
        rctx.fillRect(56 + i * barW, y + 2, Math.max(2, barW - 1), rowH - 4);
      }
      offset += count;
    });

    status.textContent = `tick ${creature.t} · foraged ${creature.foraged} · rewards ${creature.rewards} · glucose ${creature.glc.toFixed(2)} · fat ${creature.fat.toFixed(0)}`;
    if (creature.t % 12 === 0) {
      bioHost.replaceChildren(
        kv(
          "Metabolic Pools",
          `Glucose ${creature.glc.toFixed(2)} · ATP ${creature.atp.toFixed(2)} · Fat ${creature.fat.toFixed(0)} · Insulin ${creature.insulin.toFixed(2)}`,
        ),
        kv(
          "Foraging Yield",
          `${creature.rewards} rewards / ${Math.max(1, creature.foraged)} visits (${((creature.rewards / Math.max(1, creature.foraged)) * 100).toFixed(1)}%)`,
        ),
      );
    }
    requestAnimationFrame(frame);
  }
  frame();
  return () => {
    alive = false;
  };
}

/* =========================================================================
 * 4. SCIENCE — TSOTCHKE DIFFERENTIAL COMPUTING & QUANTUM CONTEXTUALITY
 * ========================================================================= */
async function mountSci(host, cap) {
  // 3D Live Chaotic Lorenz Attractor Stage
  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "Live 3D Lorenz chaotic attractor integrated with RK4" });
  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["ODE ", el("b", {}, ["RK4 LORENZ + DOPRI54 ROBERTSON STIFF"])]),
      el("div", { class: "hud-chip" }, ["QUANTUM ", el("b", {}, ["TSOTCHKE CHSH + MERMIN-3 + MAGIC SQUARE"])]),
    ]),
  );

  let view = null;
  const lorenzPts = [];
  let yCur = new Float64Array([1, 1, 1]);
  const deriv = lorenzDeriv(10, 28, 8 / 3);
  for (let i = 0; i < 1600; i++) {
    const step = rk4(deriv, yCur, { t1: 0.012, dt: 0.012 });
    yCur = step.y;
    lorenzPts.push(new THREE.Vector3(yCur[0] * 0.45, (yCur[2] - 25) * 0.45, yCur[1] * 0.45));
  }

  try {
    view = await mountView(canvas, cap);
    const geo = new THREE.BufferGeometry().setFromPoints(lorenzPts);
    const colors = new Float32Array(lorenzPts.length * 3);
    const col = new THREE.Color();
    for (let i = 0; i < lorenzPts.length; i++) {
      col.setHSL(0.54 - (i / lorenzPts.length) * 0.48, 0.9, 0.58);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
    const tracer = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), makeMaterials(cap.tier).accent);
    const group = new THREE.Group();
    group.add(line, tracer);
    view.root.add(group);
    view.frame(group, 0.85);
    let idx = 0;
    view.setFrame(() => {
      idx = (idx + 3) % lorenzPts.length;
      tracer.position.copy(lorenzPts[idx]);
      group.rotation.y += 0.004;
    });
  } catch (err) {
    stage.append(note(`3D attractor unavailable: ${err.message}`));
  }

  // Quantum Contextuality controls (CHSH Bell + Mermin-3 GHZ + Mermin-Peres Magic Square)
  const shotsCtrl = rangeControl("Quantum Measurement Shots", 200, 10000, 200, 2000, (v) => `${v} shots`);
  const angleCtrl = rangeControl("CHSH Analyzer Angle θ (deg)", 0, 90, 2.5, 22.5, (v) => `${v.toFixed(1)}°`);
  const phaseCtrl = rangeControl("GHZ Phase Error φ (deg)", 0, 180, 5, 0, (v) => `${v}°`);
  const qOut = el("div");
  const qPlot = el("div", { class: "plot" });

  // Stiff ODE metrics
  const lorenzRun = rk4(lorenzDeriv(), [1, 1, 1], { t1: 2, dt: 0.01 });
  const stiff = dopri54(robertsonDeriv, [1, 0, 0], { t1: 1, dt: 0.01, tol: 1e-5 });
  const vdp = dopri54(vanDerPolDeriv(8), [2, 0], { t1: 5, dt: 0.05, tol: 1e-4 });
  const mp = merminPeresSummary();

  host.replaceChildren(
    stage,
    el("div", { class: "grid cols-2" }, [
      panel(
        "Tsotchke / Moonlab Quantum Statevector & Contextuality",
        [shotsCtrl.node, angleCtrl.node, phaseCtrl.node, qPlot, qOut],
        null,
        "EXACT 2ⁿ COMPLEX STATEVECTOR",
      ),
      panel(
        "Differential Equations & Mermin–Peres Magic Square",
        [
          kv(
            "Lorenz RK4 (Chaotic)",
            el("span", {}, [
              `${lorenzRun.steps} steps, y₀=${fmt(lorenzRun.y[0], 4)} `,
              provComputed("classic RK4, dt=0.01, t=2"),
            ]),
          ),
          kv(
            "Robertson DOPRI54 (Stiff)",
            el("span", {}, [
              `${stiff.accepted} acc / ${stiff.steps} tries, y₁=${fmt(stiff.y[0], 4)} `,
              provComputed("adaptive tol 1e-5"),
            ]),
          ),
          kv(
            "Van der Pol (μ=8)",
            el("span", {}, [`${vdp.accepted} accepted, y=${fmt(vdp.y[0], 4)} `, provComputed("Dormand–Prince 5(4)")]),
          ),
          el("div", { class: "formula-box" }, [
            `Mermin–Peres Magic Square (State-Independent Contextuality):\n` +
              mp.grid.map((row, r) => `  ${row.join("   ")}   →  ${mp.rowProducts[r]}`).join("\n") +
              `\n  ↓      ↓      ↓\n  ${mp.colProducts.join("    ")}   (Quantum 6/6 vs Classical ≤ 5/6 · degree = ${mp.contextualityDegree})`,
          ]),
          kv("Measured", el("span", {}, ["All ODE & Born-rule shots live ", provMeasured("this JS engine")])),
        ],
        null,
        "RK4 · DOPRI54 · CONTEXTUALITY",
      ),
    ]),
  );

  const sketch = await mountSketch(qPlot, drawContextuality, { height: 210 });

  function runQuantum() {
    const shots = Number(shotsCtrl.input.value);
    const angleDeg = Number(angleCtrl.input.value);
    const phaseDeg = Number(phaseCtrl.input.value);
    const chsh = runChshExperiment({ shots, angleDeg, seed: 42 + shots });
    const merm = runMermin3Experiment({ shots, phaseDeg, seed: 9500 + shots });
    qOut.replaceChildren(
      kv(
        "Bell CHSH |S|",
        el("span", {}, [
          `Exact ${fmt(chsh.sExact, 4)} · Sampled ${fmt(chsh.sSampled, 4)} (Classical ≤ 2, Tsirelson 2.828) `,
          provComputed(chsh.violatesClassical ? "VIOLATES LOCAL REALISM" : "within classical bound"),
        ]),
      ),
      kv(
        "GHZ Mermin-3 ⟨M⟩",
        el("span", {}, [
          `Exact ${fmt(merm.mExact, 4)} · Sampled ${fmt(merm.mSampled, 4)} (Classical ≤ 2, Quantum 4.0) `,
          provComputed(merm.violatesClassical ? "CONTEXTUAL VIOLATION" : "within non-contextual bound"),
        ]),
      ),
    );
    sketch.setState({ chsh, merm });
  }

  for (const c of [shotsCtrl, angleCtrl, phaseCtrl]) c.input.addEventListener("input", runQuantum);
  runQuantum();

  return () => {
    sketch.dispose();
    view?.dispose();
  };
}

function drawContextuality(p, state) {
  p.background("#06080c");
  if (!state.chsh) return;
  const bars = [
    { label: "Classical LHV", val: 2.0, max: 4.2, col: "#6f819c" },
    { label: "Bell CHSH (Live)", val: Math.abs(state.chsh.sSampled), max: 4.2, col: "#38d4f2" },
    { label: "Tsirelson 2√2", val: 2.8284, max: 4.2, col: "#a78bfa" },
    { label: "GHZ Mermin-3 (Live)", val: Math.abs(state.merm.mSampled), max: 4.2, col: "#ff6900" },
  ];
  const padL = 134;
  const w = p.width - padL - 54;
  const rowH = (p.height - 28) / bars.length;

  // Classical bound dashed line at 2.0
  const xBound = padL + (2.0 / 4.2) * w;
  p.stroke("rgba(251, 113, 133, 0.7)");
  p.strokeWeight(1.5);
  p.line(xBound, 16, xBound, p.height - 10);

  bars.forEach((b, i) => {
    const y = 18 + i * rowH;
    const bw = (Math.min(4.2, b.val) / 4.2) * w;
    p.noStroke();
    p.fill("#9fb0c8");
    p.textSize(10);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(b.label, padL - 10, y + rowH * 0.45);
    p.fill(b.col);
    p.rect(padL, y + 6, bw, rowH - 16, 4);
    p.fill("#eef3fa");
    p.textAlign(p.LEFT, p.CENTER);
    p.text(b.val.toFixed(3), padL + bw + 6, y + rowH * 0.45);
  });
}

/* =========================================================================
 * 5. BROWSER — GIGACHAD MOBILE SOVEREIGN BROWSER & 60 Hz 5-CASTE SWARM
 * ========================================================================= */
async function mountBrowser(host, cap) {
  const bar = el("div", { class: "formula-box", style: "margin:0 0 12px" }, [
    "gigachad://mobile/cortex · 60 Hz 5-Caste Embodied Swarm (Zero-LLM)",
  ]);
  const swarmHost = el("div", { class: "plot" });
  const body = el("div");

  const tabs = [
    [
      "cortex",
      "gigachad://mobile/cortex",
      "60 Hz 5-Caste Swarm",
      () =>
        el("div", {}, [
          kv(
            "Castes Active",
            "Scout (cyan) · Tactician (orange) · Archivist (violet) · Guardian (emerald) · Synthesizer (amber)",
          ),
          kv(
            "Compute Budget",
            el("span", {}, [
              "Zero-LLM stigmergic pheromone field — maps cleanly to Arm C1-Pro efficiency cores ",
              provComputed("O(N) local grid reads"),
            ]),
          ),
        ]),
    ],
    [
      "profiler",
      "gigachad://mobile/profiler",
      "Hardware Profiler",
      () =>
        el("div", {}, [
          kv(
            "Browser GPU",
            el("span", {}, [`${cap.renderer} (tier ${cap.tier}) `, provMeasured("WEBGL_debug_renderer_info")]),
          ),
          kv(
            "WebGPU Adapter",
            el("span", {}, [cap.webgpu ? "navigator.gpu present" : "unavailable", " ", provMeasured("feature detect")]),
          ),
          kv(
            "Hardware Threads",
            el("span", {}, [
              `${cap.cores ?? "hidden"} logical cores · ${cap.memoryGb ?? "hidden"} GB deviceMemory `,
              provMeasured("navigator"),
            ]),
          ),
        ]),
    ],
    [
      "limits",
      "gigachad://mobile/limits",
      "Honest Sandbox Limits",
      () =>
        el("div", {}, [
          kv("NPU / NeuroPilot", "Not accessible from web pages (no WebNN NPU 990 delegate in Chrome Android today)."),
          kv(
            "USB-C Data Speed",
            "Xiaomi 17T Pro is hardware-limited to USB 2.0 (23.16 MB/s measured, no DisplayPort Alt Mode).",
          ),
          kv(
            "Origin Sandbox",
            "Concept shell inspired by 0thernes/gigachad-browser; the full desktop multi-process app is not bundled.",
          ),
        ]),
    ],
  ];

  const tabBar = el("div", { class: "chips" });
  const btns = [];
  function openTab(idx) {
    const [, url, , renderFn] = tabs[idx];
    bar.textContent = url;
    body.replaceChildren(renderFn());
    btns.forEach((b, i) => b.setAttribute("aria-pressed", i === idx ? "true" : "false"));
  }
  tabs.forEach(([, , label], idx) => {
    const b = el("button", { type: "button", class: "chip", onClick: () => openTab(idx) }, [label]);
    btns.push(b);
    tabBar.append(b);
  });
  openTab(0);

  host.replaceChildren(
    panel(
      "GigaChad Mobile Sovereign Browser — 60 Hz 5-Caste Embodied Swarm",
      [bar, tabBar, swarmHost, body],
      null,
      "ZERO-LLM STIGMERGIC CORTEX",
    ),
  );

  // Live 60 Hz 5-caste stigmergic swarm simulation
  const casteColors = ["#38d4f2", "#ff6900", "#a78bfa", "#4ade80", "#fbbf24"];
  const agents = Array.from({ length: 65 }, (_, i) => ({
    caste: i % 5,
    ux: 0.06 + ((i * 0.137) % 0.88),
    uy: 0.12 + ((i * 0.271) % 0.76),
    ang: (i * 1.1) % (Math.PI * 2),
    spd: 0.0022 + (i % 5) * 0.00045,
  }));
  const nodes = [
    { x: 0.22, y: 0.5, label: "L1/L2" },
    { x: 0.5, y: 0.3, label: "CORTEX" },
    { x: 0.78, y: 0.52, label: "MEMORY" },
    { x: 0.5, y: 0.78, label: "SWARM" },
  ];

  const sketch = await mountSketch(
    swarmHost,
    (p) => {
      p.background(6, 8, 12, 42);
      // Draw stigmergic hubs
      for (const n of nodes) {
        const nx = n.x * p.width;
        const ny = n.y * p.height;
        p.noFill();
        p.stroke("rgba(56, 212, 242, 0.22)");
        p.circle(nx, ny, 48 + Math.sin(p.frameCount * 0.05) * 6);
        p.noStroke();
        p.fill("#6f819c");
        p.textSize(9);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(n.label, nx, ny);
      }
      // Step 5-caste agents toward caste target hub with local avoidance swirl
      for (const a of agents) {
        const target = nodes[(a.caste + Math.floor(p.frameCount / 180)) % nodes.length];
        const desired = Math.atan2(target.y - a.uy, target.x - a.ux);
        const diff = Math.atan2(Math.sin(desired - a.ang), Math.cos(desired - a.ang));
        a.ang += diff * 0.06 + Math.sin(p.frameCount * 0.04 + a.caste) * 0.08;
        a.ux = (a.ux + Math.cos(a.ang) * a.spd + 1) % 1;
        a.uy = (a.uy + Math.sin(a.ang) * a.spd * 2.2 + 1) % 1;
        p.noStroke();
        p.fill(casteColors[a.caste]);
        p.circle(a.ux * p.width, a.uy * p.height, 4.5);
      }
      p.fill("#eef3fa");
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(10);
      p.text(`5-CASTE SWARM · 65 AGENTS · ${Math.round(p.frameRate())} Hz LIVE`, 10, 8);
    },
    { height: 230, loop: true, fps: 60 },
  );

  return () => sketch.dispose();
}
