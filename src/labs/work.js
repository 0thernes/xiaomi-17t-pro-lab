import * as THREE from "three";
import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { makeMaterials, mountView } from "../graphics/view.js";
import { mountSketch } from "../p5-loader.js";
import { provComputed, provMeasured } from "../provenance.js";
import { dopri54, lorenzDeriv, rk4, robertsonDeriv, vanDerPolDeriv } from "../sim/ode.js";
import {
  GATES,
  amplitudesSummary,
  applyCnot,
  applySingleQubit,
  blochVector,
  buildPresetState,
  entanglementEntropy,
  merminPeresSummary,
  runChshExperiment,
  runMermin3Experiment,
} from "../sim/quantum-lab.js";

export async function mount(main, { cap, route, audio }) {
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

  const dispose = await mountTab(host, which, cap, audio);
  return { dispose: dispose || (() => {}) };
}

async function mountTab(host, which, cap, audio) {
  if (which === "llm") return mountLlm(host, audio);
  if (which === "life") return mountLife(host, audio);
  if (which === "sci") return mountSci(host, cap, audio);
  if (which === "browser") return mountBrowser(host, cap, audio);
  return mountGame(host, cap, audio);
}

/* =========================================================================
 * 1. GAMING — Mali-G1 Ultra Instanced PBR Stress Arena + Frametime Scope
 * ========================================================================= */
async function mountGame(host, cap, audio) {
  const defaultCount = cap.tier === "low" ? 180 : cap.tier === "ultra" ? 2400 : cap.tier === "high" ? 1400 : 600;
  const countCtrl = rangeControl("Instanced PBR Meshes", 100, 6000, 100, defaultCount, (v) => `${v}`);
  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "Instanced PBR 3D stress arena" });
  const hudFps = el("b", {}, ["—"]);
  const hudTris = el("b", {}, ["—"]);
  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["FPS ", hudFps]),
      el("div", { class: "hud-chip" }, ["TRIANGLES ", hudTris, " · 2 DYNAMIC LIGHTS"]),
    ]),
  );

  const presetBar = el("div", { class: "chips" });
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
      [stage, presetBar, el("div", { class: "tool-bar" }, [countCtrl.node, status]), scopeHost],
      null,
      "MEASURED P50 / P95 / P99 OSCILLOSCOPE",
    ),
  );

  let view;
  const history = new Float32Array(120).fill(16.6);
  let head = 0;
  const scope = await mountSketch(
    scopeHost,
    (p) => {
      p.background("#06080c");
      const padL = 38;
      const w = p.width - padL - 12;
      const h = p.height - 30;
      const yOf = (ms) => p.height - 14 - Math.min(1, ms / 40) * h;
      p.stroke("rgba(74, 222, 128, 0.35)");
      p.line(padL, yOf(6.94), padL + w, yOf(6.94));
      p.stroke("rgba(251, 191, 36, 0.35)");
      p.line(padL, yOf(16.67), padL + w, yOf(16.67));
      // Fill under oscilloscope curve
      p.noStroke();
      p.fill("rgba(56, 212, 242, 0.14)");
      p.beginShape();
      p.vertex(padL, p.height - 14);
      for (let i = 0; i < history.length; i++) {
        const ms = history[(head + i) % history.length];
        p.vertex(padL + (i / (history.length - 1)) * w, yOf(ms));
      }
      p.vertex(padL + w, p.height - 14);
      p.endShape(p.CLOSE);

      p.stroke("#38d4f2");
      p.strokeWeight(2);
      p.noFill();
      p.beginShape();
      for (let i = 0; i < history.length; i++) {
        const ms = history[(head + i) % history.length];
        p.vertex(padL + (i / (history.length - 1)) * w, yOf(ms));
      }
      p.endShape();

      const sorted = Array.from(history).sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      p.noStroke();
      p.fill("#4ade80");
      p.textSize(9);
      p.text("144Hz", 4, yOf(6.94) + 3);
      p.fill("#fbbf24");
      p.text("60Hz", 4, yOf(16.67) + 3);
      p.fill("#9fb0c8");
      p.text(
        `FRAMETIME SCOPE (0–40 ms) · P50 ${p50.toFixed(1)} ms · P95 ${p95.toFixed(1)} ms · 1%-low ${(1000 / Math.max(1, p99)).toFixed(0)} FPS`,
        padL,
        12,
      );
    },
    { height: 155, loop: true, fps: 30 },
  );

  try {
    view = await mountView(canvas, cap);
  } catch (error) {
    status.textContent = error.message;
    return () => scope.dispose();
  }

  // Two orbiting dynamic point lights for dramatic specular highlights
  const orangeLight = new THREE.PointLight(0xff6900, 120, 48);
  const cyanLight = new THREE.PointLight(0x38d4f2, 120, 48);
  view.root.add(orangeLight, cyanLight);

  let mesh = null;
  let seeds = [];
  const dummy = new THREE.Object3D();
  const geo = new THREE.OctahedronGeometry(0.42, 1);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xd8e2f0,
    metalness: 0.84,
    roughness: 0.18,
    clearcoat: 0.85,
    iridescence: cap.tier !== "low" ? 0.9 : 0,
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
      const r = 3.2 + (i % 28) * 0.52;
      const a = i * 0.39;
      const y = ((i % 17) - 8) * 0.82;
      seeds.push({ r, a, y, p: (i * 0.37) % 6.28 });
      col.setHSL(0.06 + (i % 3) * 0.24, 0.85, 0.58);
      mesh.setColorAt(i, col);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    view.root.add(mesh);
    hudTris.textContent = `${(count * 32).toLocaleString()} tris`;
  }

  for (const [label, n] of [
    ["Mobile 60 Hz (500)", 500],
    ["144 Hz LTPO (1,800)", 1800],
    ["Extreme 6K Stress (6,000)", 6000],
  ]) {
    const b = el("button", { type: "button", class: "swatch" }, [label]);
    b.addEventListener("click", () => {
      countCtrl.input.value = String(n);
      countCtrl.sync();
      rebuild(n);
      audio?.blip("detent");
    });
    presetBar.append(b);
  }

  rebuild(defaultCount);
  view.look(24);
  countCtrl.input.addEventListener("input", () => rebuild(Number(countCtrl.input.value)));

  view.setFrame((now) => {
    const t = now * 0.001;
    orangeLight.position.set(Math.cos(t * 1.1) * 14, Math.sin(t * 0.7) * 6, Math.sin(t * 1.1) * 14);
    cyanLight.position.set(Math.cos(-t * 0.9 + 2) * 14, Math.cos(t * 0.8) * 6, Math.sin(-t * 0.9 + 2) * 14);
    const count = seeds.length;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const ang = s.a + t * 0.28;
      dummy.position.set(Math.cos(ang) * s.r, s.y + Math.sin(t * 1.4 + s.p) * 0.65, Math.sin(ang) * s.r);
      dummy.rotation.set(t + s.p, t * 0.6, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    history[head] = view.frameMs;
    head = (head + 1) % history.length;
    const fps = Math.round(1000 / Math.max(1, view.frameMs));
    hudFps.textContent = `${fps} FPS (${view.frameMs.toFixed(1)} ms)`;
    status.textContent = `${view.frameMs.toFixed(1)} ms (${fps} FPS) · ${count.toLocaleString()} instanced PBR octahedra · ${(count * 32).toLocaleString()} tris/frame`;
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

async function mountLlm(host, audio) {
  const promptInput = el("input", {
    type: "text",
    value: "Once upon a time",
    "aria-label": "Transformer prompt",
    class: "prompt-grow",
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
  const presetBar = el("div", { class: "chips wrap", "aria-label": "Neuralese intervention presets" });
  const status = el("p", { class: "status" }, [
    "39.4 MB FP16 TinyStories-8M weights are vendored locally. Press Stream Generate or a Neuralese preset.",
  ]);
  const streamBox = el("div", { class: "token-stream" }, [el("span", { class: "token-prompt" }, ["Once upon a time"])]);
  const entropyLine = el("div", { class: "note note-gap" }, [
    "Next-token Shannon entropy H(p) and 8-layer residual norms update live per token.",
  ]);
  const probHost = el("div", { class: "prob-list" });
  const attnPlot = el("div", { class: "plot" });

  function applyPreset({ mlp, attn, noise, ablate, run = true }) {
    mlpCtrl.input.value = String(mlp);
    attnCtrl.input.value = String(attn);
    noiseCtrl.input.value = String(noise);
    ablateSel.value = String(ablate);
    mlpCtrl.sync();
    attnCtrl.sync();
    noiseCtrl.sync();
    audio?.blip("detent");
    if (run && !genBtn.disabled) genBtn.click();
  }

  for (const [label, cfg] of [
    ["Baseline 1.0×", { mlp: 1.0, attn: 1.0, noise: 0, ablate: -1 }],
    ["Lobotomize L4", { mlp: 1.0, attn: 1.0, noise: 0, ablate: 4 }],
    ["Hyper-Attn 2.1×", { mlp: 1.0, attn: 2.1, noise: 0, ablate: -1 }],
    ["MLP Dream 1.8×", { mlp: 1.8, attn: 0.8, noise: 0.04, ablate: -1 }],
    ["Noise Storm", { mlp: 1.0, attn: 1.0, noise: 0.24, ablate: -1 }],
  ]) {
    const b = el("button", { type: "button", class: "swatch" }, [label]);
    b.addEventListener("click", () => applyPreset(cfg));
    presetBar.append(b);
  }

  resetBtn.addEventListener("click", () => applyPreset({ mlp: 1, attn: 1, noise: 0, ablate: -1, run: false }));

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
          presetBar,
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
        "Live 16-Head Attention Heatmap, Residual Norms & Logits",
        [attnPlot, entropyLine, el("h3", { class: "h3-gap" }, ["Next-Token Softmax Distribution"]), probHost],
        null,
        "LAYER 7 ATTENTION + 8-LAYER ||h||₂",
      ),
    ]),
  );

  const sketch = await mountSketch(attnPlot, drawAttention, { height: 265 });
  sketch.setState({ hacks: { mlpGain: 1, attnGain: 1, noiseAmp: 0, ablateLayer: -1 } });
  let cancelled = false;

  const syncPreview = () => {
    sketch.setState({
      ...(sketch.state || {}),
      hacks: {
        mlpGain: Number(mlpCtrl.input.value),
        attnGain: Number(attnCtrl.input.value),
        noiseAmp: Number(noiseCtrl.input.value),
        ablateLayer: Number(ablateSel.value),
      },
    });
  };
  for (const c of [mlpCtrl, attnCtrl, noiseCtrl]) c.input.addEventListener("input", syncPreview);
  ablateSel.addEventListener("change", syncPreview);

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

        let hBits = 0;
        let pSum = 0;
        for (const item of top) {
          if (item.prob > 1e-9) hBits -= item.prob * Math.log2(item.prob);
          pSum += item.prob;
        }
        const tail = Math.max(0, 1 - pSum);
        if (tail > 1e-6) hBits -= tail * Math.log2(tail / 32);
        entropyLine.textContent = `Top-1 confidence ${(top[0].prob * 100).toFixed(1)}% · Est. Shannon Entropy H ≈ ${hBits.toFixed(2)} bits · Perplexity ≈ ${Math.pow(2, hBits).toFixed(2)}`;

        probHost.replaceChildren(
          ...top.map((item) => {
            const label = JSON.stringify(tokenizer.decode([item.id])).slice(1, -1);
            return el("div", { class: "prob-row" }, [
              el("span", { class: "prob-label" }, [label || "␣"]),
              el("svg", { class: "prob-bar", viewBox: "0 0 100 6", preserveAspectRatio: "none" }, [
                el("rect", {
                  class: "prob-bar-fill",
                  x: "0",
                  y: "0",
                  height: "6",
                  width: (item.prob * 100).toFixed(1),
                }),
              ]),
              el("span", {}, [`${(item.prob * 100).toFixed(1)}%`]),
            ]);
          }),
        );

        sketch.setState({ telemetry: stream.telemetry, hacks: getHacks() });
        hidden = stream.step(nextId, getHacks());
        const elapsed = Math.max(0.01, (performance.now() - tGen0) / 1000);
        status.textContent = `${(produced.length / elapsed).toFixed(2)} tok/s live (${produced.length}/${total} tokens · load ${((tGen0 - tLoad0) / 1000).toFixed(2)}s)`;
        await new Promise((r) => setTimeout(r, 0));
      }
      audio?.blip("ok");
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
  const hacks = state.hacks || { mlpGain: 1, attnGain: 1, noiseAmp: 0, ablateLayer: -1 };
  if (!tel || !tel.lastLayerAttn) {
    // Rich live interactive GPT-Neo 8L x 16H Neuralese architecture map before first stream run
    const padL = 20;
    const padT = 26;
    const w = p.width - padL * 2;
    const colW = w / 8;
    p.noStroke();
    p.fill("#38d4f2");
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(10);
    p.text("GPT-NEO 8-LAYER INTERVENTION PIPELINE (PRESS STREAM GENERATE FOR LIVE Q·Kᵀ)", padL, 8);
    for (let l = 0; l < 8; l++) {
      const x = padL + l * colW + 4;
      const bw = colW - 8;
      const ablated = hacks.ablateLayer === l;
      p.fill(ablated ? "rgba(244,63,94,0.22)" : "rgba(56,212,242,0.12)");
      p.stroke(ablated ? "#fb7185" : "rgba(56,212,242,0.4)");
      p.rect(x, padT + 14, bw, 70, 5);
      p.fill(ablated ? "rgba(244,63,94,0.16)" : "rgba(255,105,0,0.16)");
      p.stroke(ablated ? "#fb7185" : "rgba(255,105,0,0.45)");
      p.rect(x, padT + 96, bw, 70, 5);
      p.noStroke();
      p.fill(ablated ? "#fb7185" : "#eef3fa");
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(9.5);
      p.text(`h.${l}`, x + bw / 2, padT + 6);
      p.fill("#38d4f2");
      p.text(ablated ? "SKIP" : l % 2 === 0 ? "GLOB" : "LOC", x + bw / 2, padT + 38);
      p.fill("#9fb0c8");
      p.textSize(8.5);
      p.text(`${hacks.attnGain.toFixed(1)}×`, x + bw / 2, padT + 60);
      p.fill("#ff9345");
      p.textSize(9);
      p.text(ablated ? "SKIP" : "MLP", x + bw / 2, padT + 122);
      p.fill("#9fb0c8");
      p.textSize(8.5);
      p.text(`${hacks.mlpGain.toFixed(1)}×`, x + bw / 2, padT + 144);
    }
    p.textAlign(p.LEFT, p.TOP);
    p.fill("#6f819c");
    p.textSize(9.5);
    p.text(
      `Active Neuralese hooks: Attn ${hacks.attnGain.toFixed(2)}× · MLP ${hacks.mlpGain.toFixed(2)}× · Noise σ=${hacks.noiseAmp.toFixed(2)} · Ablate ${hacks.ablateLayer >= 0 ? `h.${hacks.ablateLayer}` : "none"}`,
      padL,
      p.height - 22,
    );
    return;
  }
  const heads = tel.lastLayerAttn.length;
  const seq = tel.lastLayerAttn[0].length;
  const padL = 40;
  const padT = 22;
  const splitH = p.height * 0.66;
  const w = p.width - padL - 12;
  const h = splitH - padT - 6;
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
    p.textSize(7.5);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(`H${hd}`, padL - 5, padT + hd * ch + ch / 2);
  }
  p.fill("#38d4f2");
  p.textAlign(p.LEFT, p.TOP);
  p.textSize(9.5);
  p.text(`LAYER 7 ATTENTION (16 HEADS × ${seq} TOKENS)`, padL, 6);

  // Bottom strip: 8-layer residual stream ||h_l||_2 L2 norm bar chart
  const normTop = splitH + 16;
  const normH = p.height - normTop - 16;
  const maxNorm = Math.max(1, ...tel.layerNorms);
  const barW = w / tel.layerNorms.length;
  p.fill("#9fb0c8");
  p.textSize(8.5);
  p.text("8-LAYER RESIDUAL STREAM L2 NORM ||h_l||₂", padL, splitH + 2);
  for (let l = 0; l < tel.layerNorms.length; l++) {
    const bh = (tel.layerNorms[l] / maxNorm) * normH;
    const ablated = hacks.ablateLayer === l;
    p.fill(ablated ? "#fb7185" : "#38d4f2");
    p.rect(padL + l * barW + 3, normTop + normH - bh, barW - 8, bh, 3);
    p.fill("#8799b4");
    p.textAlign(p.CENTER, p.TOP);
    p.text(`L${l}`, padL + l * barW + barW / 2 - 1, normTop + normH + 3);
  }
  p.textAlign(p.LEFT, p.TOP);
}

/* =========================================================================
 * 3. A-LIFE — GLITCHLING (272 NEURONS, 14 REGIONS) + FLAW INJECTION
 * ========================================================================= */
async function mountLife(host, audio) {
  const arenaCanvas = el("canvas", {
    width: "440",
    height: "440",
    class: "life-arena",
    "aria-label": "Glitchling 272-neuron foraging arena (click to drop snacks)",
  });
  const rasterCanvas = el("canvas", {
    width: "460",
    height: "320",
    class: "life-raster",
    "aria-label": "Live 14-region 272-neuron neural activity raster",
  });
  const homeoCanvas = el("canvas", {
    width: "460",
    height: "105",
    class: "life-spark",
    "aria-label": "Live metabolic homeostasis sparkline",
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
          homeoCanvas,
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

  await import("../../vendor/glitchling/sim.js");
  const GL = globalThis.GL;

  let seed = 1;
  let creature = new GL.Glitchling(seed, GL.DEFAULT_FLAWS);
  let lastRewards = 0;

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
    lastRewards = 0;
    syncFlaws();
    audio?.blip("ok");
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
    audio?.sonify("dopamine", 0.7);
  });

  const ctx = arenaCanvas.getContext("2d");
  const rctx = rasterCanvas.getContext("2d");
  const hctx = homeoCanvas.getContext("2d");
  const trail = [];
  const glcHist = [];
  const atpHist = [];
  let alive = true;

  function frame() {
    if (!alive) return;
    const steps = Number(speedCtrl.input.value);
    for (let i = 0; i < steps; i++) creature.step();
    if (creature.rewards > lastRewards) {
      lastRewards = creature.rewards;
      audio?.sonify("dopamine", 0.9);
    }
    trail.push({ x: creature.pos.x, y: creature.pos.y });
    if (trail.length > 120) trail.shift();
    glcHist.push(creature.glc);
    atpHist.push(creature.atp);
    if (glcHist.length > 140) {
      glcHist.shift();
      atpHist.shift();
    }

    // Draw foraging arena
    const W = arenaCanvas.width;
    ctx.fillStyle = "#06080c";
    ctx.fillRect(0, 0, W, W);

    // Subtle grid
    ctx.strokeStyle = "rgba(31, 42, 60, 0.45)";
    ctx.lineWidth = 1;
    for (let g = 1; g < 8; g++) {
      ctx.beginPath();
      ctx.moveTo((g * W) / 8, 0);
      ctx.lineTo((g * W) / 8, W);
      ctx.moveTo(0, (g * W) / 8);
      ctx.lineTo(W, (g * W) / 8);
      ctx.stroke();
    }

    // 16 foraging sites with radial scent diffusion halos & learned wSite belief ring
    for (let k = 0; k < GL.SITES; k++) {
      const sp = GL.SITE_POS[k];
      const sx = sp.x * W;
      const sy = sp.y * W;
      const pVal = creature.pTrue ? creature.pTrue[k] : 0.2;
      const wVal = creature.wSite ? creature.wSite[k] : 0.25;
      const snack = creature.snack ? creature.snack[k] : 0;

      const rad = 18 + pVal * 32 + snack * 20;
      const grad = ctx.createRadialGradient(sx, sy, 2, sx, sy, rad);
      if (snack > 0.05) {
        grad.addColorStop(0, "rgba(74, 222, 128, 0.52)");
        grad.addColorStop(1, "rgba(74, 222, 128, 0)");
      } else if (k === creature.best) {
        grad.addColorStop(0, "rgba(255, 105, 0, 0.45)");
        grad.addColorStop(1, "rgba(255, 105, 0, 0)");
      } else {
        grad.addColorStop(0, "rgba(56, 212, 242, 0.24)");
        grad.addColorStop(1, "rgba(56, 212, 242, 0)");
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = snack > 0.05 ? "#4ade80" : k === creature.best ? "#ff6900" : "#38d4f2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 8 + wVal * 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Gradient bioluminescent motion ribbon
    for (let i = 1; i < trail.length; i++) {
      const a = i / trail.length;
      ctx.strokeStyle = `rgba(${Math.round(56 + a * 199)}, ${Math.round(212 - a * 107)}, ${Math.round(242 - a * 242)}, ${a * 0.72})`;
      ctx.lineWidth = 1.2 + a * 2.4;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x * W, trail[i - 1].y * W);
      ctx.lineTo(trail[i].x * W, trail[i].y * W);
      ctx.stroke();
    }

    // Creature body + 14-region radial neuro-aura halo
    const cx = creature.pos.x * W;
    const cy = creature.pos.y * W;
    const rates = creature.rate || creature.rNeu || [];
    for (let seg = 0; seg < 14; seg++) {
      const act = Math.max(0, Math.min(1, Number(rates[seg * 16]) || 0.2));
      const ang0 = (seg / 14) * Math.PI * 2;
      const ang1 = ((seg + 0.8) / 14) * Math.PI * 2;
      ctx.strokeStyle = `rgba(167, 139, 250, ${0.25 + act * 0.7})`;
      ctx.lineWidth = 2.5 + act * 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 15 + act * 6, ang0, ang1);
      ctx.stroke();
    }
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

    // Draw live scrolling metabolic homeostasis sparkline (Glucose cyan + ATP emerald)
    const HW = homeoCanvas.width;
    const HH = homeoCanvas.height;
    hctx.fillStyle = "#06080c";
    hctx.fillRect(0, 0, HW, HH);
    const drawCurve = (arr, color, maxV) => {
      if (arr.length < 2) return;
      hctx.strokeStyle = color;
      hctx.lineWidth = 1.8;
      hctx.beginPath();
      arr.forEach((v, i) => {
        const px = 12 + (i / 139) * (HW - 24);
        const py = HH - 12 - Math.min(1, Math.max(0, v / maxV)) * (HH - 30);
        if (i === 0) hctx.moveTo(px, py);
        else hctx.lineTo(px, py);
      });
      hctx.stroke();
    };
    drawCurve(glcHist, "#38d4f2", 2.0);
    drawCurve(atpHist, "#4ade80", 1.5);
    hctx.fillStyle = "#9fb0c8";
    hctx.font = "600 10px monospace";
    hctx.fillText(
      `HOMEOSTASIS · Glucose (cyan) ${creature.glc.toFixed(2)} · ATP (green) ${creature.atp.toFixed(2)}`,
      12,
      14,
    );

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
async function mountSci(host, cap, audio) {
  // Interactive 3D Stage toggling between RK4 Chaotic Lorenz Attractor and 3D Quantum Bloch Sphere!
  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "Live 3D Lorenz chaotic attractor and Quantum Bloch Sphere" });
  const modeLorenzBtn = el("button", { type: "button", class: "hud-btn", "aria-pressed": "true" }, ["3D RK4 Lorenz"]);
  const modeBlochBtn = el("button", { type: "button", class: "hud-btn", "aria-pressed": "false" }, [
    "3D Quantum Bloch Sphere",
  ]);
  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["TSOTCHKE ", el("b", {}, ["ODE + EXACT 2ⁿ STATEVECTOR"])]),
      el("div", { class: "hud-actions" }, [modeLorenzBtn, modeBlochBtn]),
    ]),
  );

  // Interactive Quantum Circuit State (default starts in Bell |Phi+>)
  let circuit = buildPresetState("bell");
  let blochVec = blochVector(circuit.state, 0);
  let blochArrow = null;
  let blochTip = null;
  let view = null;
  let sceneMode = "lorenz";

  const lorenzPts = [];
  let yCur = new Float64Array([1, 1, 1]);
  const deriv = lorenzDeriv(10, 28, 8 / 3);
  for (let i = 0; i < 1600; i++) {
    const step = rk4(deriv, yCur, { t1: 0.012, dt: 0.012 });
    yCur = step.y;
    lorenzPts.push(new THREE.Vector3(yCur[0] * 0.45, (yCur[2] - 25) * 0.45, yCur[1] * 0.45));
  }

  function build3dScene(which) {
    sceneMode = which;
    modeLorenzBtn.setAttribute("aria-pressed", which === "lorenz" ? "true" : "false");
    modeBlochBtn.setAttribute("aria-pressed", which === "bloch" ? "true" : "false");
    if (!view) return;
    view.clear();
    blochArrow = null;
    blochTip = null;
    const mats = makeMaterials(cap.tier);

    if (which === "bloch") {
      const grp = new THREE.Group();
      // Glare-free geodesic Bloch sphere wireframe + crisp equatorial rings
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(4, 28, 20),
        new THREE.MeshBasicMaterial({
          color: 0x38d4f2,
          transparent: true,
          opacity: 0.16,
          wireframe: true,
        }),
      );
      const ringMatCyan = new THREE.MeshBasicMaterial({ color: 0x38d4f2, transparent: true, opacity: 0.72 });
      const ringMatViolet = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.55 });
      const ringMatSlate = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.42 });
      const eqXY = new THREE.Mesh(new THREE.TorusGeometry(4, 0.032, 10, 64), ringMatCyan);
      eqXY.rotation.x = Math.PI / 2;
      const eqXZ = new THREE.Mesh(new THREE.TorusGeometry(4, 0.024, 10, 64), ringMatViolet);
      const eqYZ = new THREE.Mesh(new THREE.TorusGeometry(4, 0.024, 10, 64), ringMatSlate);
      eqYZ.rotation.y = Math.PI / 2;
      grp.add(sphere, eqXY, eqXZ, eqYZ);

      // Axes |0> (+Y), |1> (-Y), |+> (+X), |+i> (+Z)
      const axisGeo = new THREE.CylinderGeometry(0.026, 0.026, 9.2, 8);
      const yAxis = new THREE.Mesh(
        axisGeo,
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 }),
      );
      const xAxis = new THREE.Mesh(axisGeo, ringMatCyan);
      xAxis.rotation.z = Math.PI / 2;
      const zAxis = new THREE.Mesh(axisGeo, ringMatViolet);
      zAxis.rotation.x = Math.PI / 2;
      grp.add(yAxis, xAxis, zAxis);

      const makePoleTag = (txt, color, x, y, z) => {
        const c = document.createElement("canvas");
        c.width = 128;
        c.height = 64;
        const cx = c.getContext("2d");
        cx.fillStyle = color;
        cx.font = "700 38px monospace";
        cx.textAlign = "center";
        cx.textBaseline = "middle";
        cx.fillText(txt, 64, 34);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
        spr.position.set(x, y, z);
        spr.scale.set(1.5, 0.75, 1);
        return spr;
      };
      grp.add(
        makePoleTag("|0⟩", "#fbbf24", 0, 5.1, 0),
        makePoleTag("|1⟩", "#fbbf24", 0, -5.1, 0),
        makePoleTag("|+⟩", "#38d4f2", 5.1, 0, 0),
        makePoleTag("|+i⟩", "#a78bfa", 0, 0, 5.1),
      );

      // Live Bloch state vector arrow + glowing tip
      blochArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        4,
        0xff6900,
        0.75,
        0.42,
      );
      blochTip = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), mats.accent);
      grp.add(blochArrow, blochTip);
      view.root.add(grp);
      view.frame(grp, 0.88);
      syncBloch3d();
      view.setFrame(() => {
        grp.rotation.y += 0.004;
      });
    } else {
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
      const tracer = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), mats.accent);
      const group = new THREE.Group();
      group.add(line, tracer);
      view.root.add(group);
      view.frame(group, 0.88);
      let idx = 0;
      view.setFrame(() => {
        idx = (idx + 3) % lorenzPts.length;
        tracer.position.copy(lorenzPts[idx]);
        group.rotation.y += 0.004;
      });
    }
  }

  function syncBloch3d() {
    if (!blochArrow || !blochTip) return;
    // Bloch coordinates: X -> X, Z -> Y (|0> up), Y -> Z
    const v = new THREE.Vector3(blochVec.x, blochVec.z, blochVec.y);
    const len = v.length();
    if (len < 0.02) {
      blochArrow.visible = false;
      blochTip.position.set(0, 0, 0);
      blochTip.scale.setScalar(1.3);
    } else {
      blochArrow.visible = true;
      blochArrow.setDirection(v.clone().normalize());
      blochArrow.setLength(len * 4, 0.72, 0.38);
      blochTip.position.copy(v.multiplyScalar(4));
      blochTip.scale.setScalar(1.0);
    }
  }

  modeLorenzBtn.addEventListener("click", () => build3dScene("lorenz"));
  modeBlochBtn.addEventListener("click", () => build3dScene("bloch"));

  try {
    view = await mountView(canvas, cap);
    build3dScene("lorenz");
  } catch (err) {
    stage.append(note(`3D stage unavailable: ${err.message}`));
  }

  // Interactive Quantum Gate Composer + Amplitude Phase Wheel
  const gateBar = el("div", { class: "chips wrap" });
  const presetBar = el("div", { class: "chips wrap" });
  const circuitTape = el("div", { class: "formula-box formula-gap" }, [""]);
  const ampPlot = el("div", { class: "plot" });
  const circuitMetrics = el("div");

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
    panel(
      "Interactive Quantum Circuit Composer & Complex Amplitude Phase Wheel",
      [presetBar, gateBar, circuitTape, ampPlot, circuitMetrics],
      null,
      "LIVE STATEVECTOR · BLOCH + ENTANGLEMENT ENTROPY",
    ),
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

  const ampSketch = await mountSketch(ampPlot, drawAmplitudes, { height: 175 });
  const sketch = await mountSketch(qPlot, drawContextuality, { height: 210 });

  function updateCircuitUi() {
    blochVec = blochVector(circuit.state, 0);
    const ent = entanglementEntropy(circuit.state, 0);
    const amps = amplitudesSummary(circuit.state);
    circuitTape.textContent = `Circuit (${circuit.state.nQubits}q): ${circuit.gates.length ? circuit.gates.join(" → ") : "|00⟩ ground state"}`;
    circuitMetrics.replaceChildren(
      kv(
        "Qubit-0 Reduced Bloch Vector",
        el("span", {}, [
          `(${blochVec.x.toFixed(3)}, ${blochVec.y.toFixed(3)}, ${blochVec.z.toFixed(3)}) · Purity Tr(ρ₀²) = ${blochVec.purity.toFixed(4)} `,
          provComputed("⟨X⟩, ⟨Y⟩, ⟨Z⟩ reduced density matrix"),
        ]),
      ),
      kv(
        "Entanglement Entropy S(ρ₀)",
        el("span", {}, [
          `${ent.toFixed(4)} bits ${ent > 0.95 ? "(MAXIMALLY ENTANGLED)" : ent > 0.05 ? "(ENTANGLED)" : "(SEPARABLE)"} `,
          provComputed("−Tr(ρ₀ log₂ ρ₀)"),
        ]),
      ),
    );
    ampSketch.setState({ amps, blochVec, ent });
    syncBloch3d();
  }

  for (const [id, label] of [
    ["zero", "Reset |00⟩"],
    ["plus", "Superposition |+0⟩"],
    ["bell", "Bell |Φ⁺⟩"],
    ["magic", "Magic T-State"],
    ["ghz", "3-Qubit GHZ"],
  ]) {
    const b = el("button", { type: "button", class: "swatch" }, [label]);
    b.addEventListener("click", () => {
      circuit = buildPresetState(id);
      if (sceneMode !== "bloch") build3dScene("bloch");
      updateCircuitUi();
      audio?.sonify("quantum", 0.5);
    });
    presetBar.append(b);
  }

  for (const [label, applyFn] of [
    ["H(q0)", (s) => applySingleQubit(s, 0, GATES.H)],
    ["X(q0)", (s) => applySingleQubit(s, 0, GATES.X)],
    ["Y(q0)", (s) => applySingleQubit(s, 0, GATES.Y)],
    ["Z(q0)", (s) => applySingleQubit(s, 0, GATES.Z)],
    ["S(q0)", (s) => applySingleQubit(s, 0, GATES.S)],
    ["T(q0)", (s) => applySingleQubit(s, 0, GATES.T)],
    ["Ry(π/4)", (s) => applySingleQubit(s, 0, GATES.Ry(Math.PI / 4))],
    ["CNOT(0→1)", (s) => applyCnot(s, 0, 1)],
  ]) {
    const b = el("button", { type: "button", class: "btn" }, [label]);
    b.addEventListener("click", () => {
      applyFn(circuit.state);
      circuit.gates.push(label);
      if (circuit.gates.length > 10) circuit.gates.shift();
      if (sceneMode !== "bloch") build3dScene("bloch");
      updateCircuitUi();
      audio?.sonify("quantum", 0.3 + Math.abs(blochVec.z) * 0.6);
    });
    gateBar.append(b);
  }
  updateCircuitUi();

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
    ampSketch.dispose();
    sketch.dispose();
    view?.dispose();
  };
}

function drawAmplitudes(p, state) {
  p.background("#06080c");
  const amps = state.amps || [];
  if (!amps.length) return;
  const n = amps.length;
  const padX = 18;
  const colW = (p.width - padX * 2) / n;
  const wheelY = 58;
  const wheelR = Math.min(26, colW * 0.32);

  p.noStroke();
  p.fill("#38d4f2");
  p.textSize(9.5);
  p.textAlign(p.LEFT, p.TOP);
  p.text("COMPLEX AMPLITUDE PHASE WHEELS |α|·e^(iφ) & BORN PROBABILITIES", padX, 6);

  for (let i = 0; i < n; i++) {
    const a = amps[i];
    const cx = padX + i * colW + colW / 2;
    // Phase circle
    p.noFill();
    p.stroke("rgba(255,255,255,0.14)");
    p.strokeWeight(1);
    p.circle(cx, wheelY, wheelR * 2);

    if (a.mag > 0.005) {
      // Filled sector proportional to |alpha|
      p.fill("rgba(56, 212, 242, 0.22)");
      p.noStroke();
      p.circle(cx, wheelY, wheelR * 2 * a.mag);
      // Phase needle
      p.stroke("#ff6900");
      p.strokeWeight(2.2);
      p.line(cx, wheelY, cx + Math.cos(a.phase) * wheelR * a.mag, wheelY - Math.sin(a.phase) * wheelR * a.mag);
    }

    // Probability bar beneath wheel
    const barW = Math.min(34, colW - 12);
    const barTop = 104;
    const barMaxH = 44;
    p.noStroke();
    p.fill("#121a27");
    p.rect(cx - barW / 2, barTop, barW, barMaxH, 3);
    p.fill("#38d4f2");
    const bh = a.prob * barMaxH;
    p.rect(cx - barW / 2, barTop + barMaxH - bh, barW, bh, 3);

    p.fill("#eef3fa");
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(9.5);
    p.text(a.ket, cx, barTop + barMaxH + 5);
    p.fill("#8799b4");
    p.textSize(8.5);
    p.text(`${(a.prob * 100).toFixed(0)}%`, cx, barTop - 13);
  }
  p.textAlign(p.LEFT, p.TOP);
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
async function mountBrowser(host, cap, audio) {
  const bar = el("div", { class: "formula-box formula-gap" }, [
    "gigachad://mobile/cortex · 60 Hz 5-Caste Embodied Stigmergic Swarm (Click to Drop Attractors / Threats)",
  ]);
  const swarmHost = el("div", { class: "plot plot-aim" });
  const body = el("div");

  let dropKind = "task";
  const modeBtn = el("button", { type: "button", class: "swatch", "aria-pressed": "false" }, [
    "Click Drops: Task Attractor",
  ]);
  const spawnThreatBtn = el("button", { type: "button", class: "btn" }, ["Spawn Adversarial Threat"]);
  const clearDropsBtn = el("button", { type: "button", class: "btn" }, ["Clear Nodes"]);

  const tabs = [
    [
      "cortex",
      "gigachad://mobile/cortex",
      "60 Hz 5-Caste Swarm",
      () =>
        el("div", {}, [
          kv(
            "Castes Active (80 Agents)",
            "Scout (cyan) · Tactician (orange) · Archivist (violet) · Guardian (emerald) · Synthesizer (amber)",
          ),
          kv(
            "Interactive Stigmergy",
            el("span", {}, [
              "48×24 continuous pheromone field + synaptic mesh chords — Guardians intercept adversarial threats live ",
              provComputed("O(N) grid reads · zero LLM"),
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
  tabBar.append(modeBtn, spawnThreatBtn, clearDropsBtn);
  openTab(0);

  host.replaceChildren(
    panel(
      "GigaChad Mobile Sovereign Browser — Interactive 60 Hz 5-Caste Stigmergic Cortex",
      [bar, tabBar, swarmHost, body],
      null,
      "ZERO-LLM PHEROMONE FIELD + THREAT INTERCEPT",
    ),
  );

  // Live 60 Hz 5-caste stigmergic pheromone grid + interactive attractors & threats
  const casteColors = ["#38d4f2", "#ff6900", "#a78bfa", "#4ade80", "#fbbf24"];
  const GX = 48;
  const GY = 22;
  const pheroTask = new Float32Array(GX * GY);
  const pheroThreat = new Float32Array(GX * GY);

  const agents = Array.from({ length: 80 }, (_, i) => ({
    caste: i % 5,
    ux: 0.06 + ((i * 0.137) % 0.88),
    uy: 0.12 + ((i * 0.271) % 0.76),
    ang: (i * 1.1) % (Math.PI * 2),
    spd: 0.0024 + (i % 5) * 0.00045,
  }));
  const nodes = [
    { x: 0.2, y: 0.5, label: "L1/L2" },
    { x: 0.5, y: 0.28, label: "CORTEX" },
    { x: 0.8, y: 0.5, label: "MEMORY" },
    { x: 0.5, y: 0.78, label: "SWARM" },
  ];
  const userDrops = []; // { x, y, kind: 'task'|'threat', hp: 1 }

  modeBtn.addEventListener("click", () => {
    dropKind = dropKind === "task" ? "threat" : "task";
    modeBtn.textContent = dropKind === "task" ? "Click Drops: Task Attractor" : "Click Drops: Adversarial Threat";
    modeBtn.setAttribute("aria-pressed", dropKind === "threat" ? "true" : "false");
    audio?.blip("detent");
  });
  spawnThreatBtn.addEventListener("click", () => {
    userDrops.push({ x: 0.15 + Math.random() * 0.7, y: 0.2 + Math.random() * 0.6, kind: "threat", hp: 1 });
    audio?.sonify("thermal", 0.85);
  });
  clearDropsBtn.addEventListener("click", () => {
    userDrops.length = 0;
    pheroTask.fill(0);
    pheroThreat.fill(0);
  });

  const sketch = await mountSketch(
    swarmHost,
    (p) => {
      p.background("#06080c");
      const cw = p.width / GX;
      const ch = p.height / GY;

      // Evaporate pheromone grid & paint glowing trail heatmap
      let totalFlux = 0;
      p.noStroke();
      for (let j = 0; j < GY; j++) {
        for (let i = 0; i < GX; i++) {
          const idx = j * GX + i;
          pheroTask[idx] *= 0.965;
          pheroThreat[idx] *= 0.955;
          const pt = pheroTask[idx];
          const pr = pheroThreat[idx];
          totalFlux += pt + pr;
          if (pt > 0.03 || pr > 0.03) {
            p.fill(
              Math.min(255, Math.round(pr * 245 + pt * 45)),
              Math.min(255, Math.round(pt * 175 + pr * 30)),
              Math.min(255, Math.round(pt * 225 + pr * 60)),
              Math.min(130, Math.round((pt + pr) * 140)),
            );
            p.rect(i * cw, j * ch, cw + 0.5, ch + 0.5);
          }
        }
      }

      // Draw permanent cortex hubs
      for (const n of nodes) {
        const nx = n.x * p.width;
        const ny = n.y * p.height;
        p.noFill();
        p.stroke("rgba(56, 212, 242, 0.25)");
        p.circle(nx, ny, 44 + Math.sin(p.frameCount * 0.05) * 5);
        p.noStroke();
        p.fill("#7e92b0");
        p.textSize(9);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(n.label, nx, ny);
      }

      // Draw interactive Task Attractors & Adversarial Threats
      for (let d = userDrops.length - 1; d >= 0; d--) {
        const drop = userDrops[d];
        const dx = drop.x * p.width;
        const dy = drop.y * p.height;
        const isThreat = drop.kind === "threat";
        p.noFill();
        p.stroke(isThreat ? "#fb7185" : "#4ade80");
        p.strokeWeight(2);
        p.circle(dx, dy, 16 + Math.sin(p.frameCount * 0.12) * 4);
        p.noStroke();
        p.fill(isThreat ? "rgba(251,113,133,0.22)" : "rgba(74,222,128,0.2)");
        p.circle(dx, dy, 30 * drop.hp);
        if (drop.hp <= 0.05) userDrops.splice(d, 1);
      }

      // Step 80 agents across 5 castes + draw Synthesizer synaptic mesh chords
      let links = 0;
      const activeThreat = userDrops.find((d) => d.kind === "threat");
      const activeTask = userDrops.find((d) => d.kind === "task");

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        let target = nodes[(a.caste + Math.floor(p.frameCount / 180)) % nodes.length];
        if (a.caste === 3 && activeThreat) {
          // Guardian caste actively hunts adversarial threats!
          target = activeThreat;
          if (Math.hypot(a.ux - activeThreat.x, a.uy - activeThreat.y) < 0.055) {
            activeThreat.hp -= 0.02;
          }
        } else if (activeTask && (a.caste === 0 || a.caste === 1)) {
          target = activeTask;
        }
        const desired = Math.atan2(target.y - a.uy, target.x - a.ux);
        const diff = Math.atan2(Math.sin(desired - a.ang), Math.cos(desired - a.ang));
        a.ang += diff * 0.08 + Math.sin(p.frameCount * 0.04 + i) * 0.06;
        a.ux = (a.ux + Math.cos(a.ang) * a.spd + 1) % 1;
        a.uy = (a.uy + Math.sin(a.ang) * a.spd * 2.1 + 1) % 1;

        // Deposit caste pheromone into 2D grid
        const gx = Math.max(0, Math.min(GX - 1, Math.floor(a.ux * GX)));
        const gy = Math.max(0, Math.min(GY - 1, Math.floor(a.uy * GY)));
        if (a.caste === 1 || activeThreat) pheroThreat[gy * GX + gx] = Math.min(1, pheroThreat[gy * GX + gx] + 0.16);
        else pheroTask[gy * GX + gx] = Math.min(1, pheroTask[gy * GX + gx] + 0.22);

        // Synthesizer caste draws live synaptic communication chords to nearby agents
        if (a.caste === 4) {
          p.stroke("rgba(251, 191, 36, 0.28)");
          p.strokeWeight(1);
          for (let j = i + 1; j < Math.min(agents.length, i + 18); j++) {
            const b = agents[j];
            if (Math.hypot(a.ux - b.ux, a.uy - b.uy) < 0.12) {
              p.line(a.ux * p.width, a.uy * p.height, b.ux * p.width, b.uy * p.height);
              links += 1;
            }
          }
        }

        p.noStroke();
        p.fill(casteColors[a.caste]);
        p.circle(a.ux * p.width, a.uy * p.height, a.caste === 3 && activeThreat ? 5.8 : 4.4);
      }

      p.fill("#eef3fa");
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(10);
      p.text(
        `5-CASTE SWARM · 80 AGENTS · ${links} SYNAPTIC LINKS · FLUX ${totalFlux.toFixed(1)} · ${Math.round(p.frameRate())} Hz`,
        10,
        8,
      );
    },
    {
      height: 260,
      loop: true,
      fps: 60,
      mousePressed: (p) => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
          userDrops.push({
            x: p.mouseX / p.width,
            y: p.mouseY / p.height,
            kind: dropKind,
            hp: 1,
          });
          if (userDrops.length > 8) userDrops.shift();
          audio?.blip(dropKind === "threat" ? "warn" : "ok");
        }
      },
    },
  );

  return () => sketch.dispose();
}
