import * as THREE from "three";
import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { buildThermalDieStage, makeMaterials, mountView } from "../graphics/view.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed } from "../provenance.js";
import {
  DIE_HEAT_ZONES,
  THERMAL_PROFILES,
  createDieThermalGrid,
  ironbowRgb,
  simulateSustainedThrottle,
} from "../sim/thermal-fdtd.js";
import { getSpecs } from "../specs.js";

export async function mount(main, { cap, audio }) {
  const specs = getSpecs();
  const sim = createDieThermalGrid({ ambientC: 25, vcEnabled: true, profileId: "gaming_nomad" });
  // Pre-warm slightly so opening frame already shows realistic glowing die thermal gradients
  for (let i = 0; i < 24; i++) sim.step(0.18, 4);

  // Offscreen high-res canvas driving the 3D FLIR ShaderMaterial texture
  const texCanvas = document.createElement("canvas");
  texCanvas.width = sim.nx;
  texCanvas.height = sim.ny;
  const texCtx = texCanvas.getContext("2d");
  const texImg = texCtx.createImageData(sim.nx, sim.ny);
  const thermalTex = new THREE.CanvasTexture(texCanvas);
  thermalTex.colorSpace = THREE.SRGBColorSpace;
  thermalTex.minFilter = THREE.LinearFilter;
  thermalTex.magFilter = THREE.LinearFilter;

  function syncThermalTexture() {
    const t = sim.temp;
    const d = texImg.data;
    for (let k = 0; k < t.length; k++) {
      const [r, g, b] = ironbowRgb(t[k], 24, 108);
      const p = k * 4;
      d[p] = r;
      d[p + 1] = g;
      d[p + 2] = b;
      d[p + 3] = 255;
    }
    texCtx.putImageData(texImg, 0, 0);
    thermalTex.needsUpdate = true;
  }
  syncThermalTexture();

  // Live KPI value spans
  const peakVal = el("span", { class: "v-cyan" }, ["—"]);
  const clkVal = el("span", { class: "v-accent" }, ["4.21"]);
  const pwrVal = el("span", { class: "v-ok" }, ["—"]);
  const batVal = el("span", { class: "v-warn" }, ["—"]);
  const probeHud = el("div", { class: "probe-hud", hidden: true });

  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "3D FLIR thermal simulation of Dimensity 9500 die and 3D IceLoop VC" });
  const vcHudBtn = el("button", { type: "button", class: "hud-btn", "aria-pressed": "true" }, ["3D IceLoop VC: ON"]);
  const resetHudBtn = el("button", { type: "button", class: "hud-btn" }, ["Cool Reset"]);

  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["FLIR PDE ", el("b", {}, ["10.88 × 12.92 mm · 2D FDTD"])]),
      el("div", { class: "hud-actions" }, [vcHudBtn, resetHudBtn]),
    ]),
    probeHud,
  );

  // Load Profile Chips
  let activeProfile = "gaming_nomad";
  let vcEnabled = true;
  const profileButtons = [];
  const profileBar = el("div", { class: "chips wrap", "aria-label": "Thermal load profiles" });
  for (const prof of Object.values(THERMAL_PROFILES)) {
    const btn = el(
      "button",
      {
        type: "button",
        class: "swatch",
        "aria-pressed": prof.id === activeProfile ? "true" : "false",
        title: prof.desc,
      },
      [prof.label],
    );
    btn.addEventListener("click", () => {
      activeProfile = prof.id;
      sim.setProfile(prof.id);
      for (const b of profileButtons) b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      audio?.blip("detent");
      refreshSustainedChart();
    });
    profileButtons.push(btn);
    profileBar.append(btn);
  }

  const ambCtrl = rangeControl("Ambient Room Temp (°C)", 15, 45, 1, 25, (v) => `${v} °C`);
  ambCtrl.input.addEventListener("input", () => {
    sim.setAmbient(Number(ambCtrl.input.value));
    refreshSustainedChart();
  });

  function toggleVc() {
    vcEnabled = !vcEnabled;
    sim.setVc(vcEnabled);
    vcHudBtn.textContent = vcEnabled ? "3D IceLoop VC: ON" : "3D IceLoop VC: OFF";
    vcHudBtn.setAttribute("aria-pressed", vcEnabled ? "true" : "false");
    audio?.sonify("thermal", vcEnabled ? 0.35 : 0.88);
  }
  vcHudBtn.addEventListener("click", toggleVc);
  resetHudBtn.addEventListener("click", () => {
    sim.reset();
    audio?.blip("ok");
  });

  const injectBtn = el("button", { type: "button", class: "primary" }, ["Pulse +5W CPU Hotspot"]);
  injectBtn.addEventListener("click", () => {
    sim.injectHotspot(0.5, 0.16, 5.0, 4.2);
    audio?.sonify("thermal", 0.92);
  });

  const flir2dHost = el("div", { class: "plot" });
  const flirProbeLine = el("p", { class: "status" }, [
    "Click or drag anywhere on the 2D FLIR silicon map to inject localized heat watts.",
  ]);
  const sustainedHost = el("div", { class: "plot" });
  const zoneLedger = el("div");

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["5,500 mm² 3D ICELOOP · 7,000 mAh Si-C"]),
      el("span", {}, ["REAL-TIME 2D HEAT EQUATION PDE · LEAKAGE RUNAWAY · DVFS THROTTLING"]),
    ]),
    el("h1", {}, ["Thermal PDE, 3D IceLoop Vapor Chamber & Power"]),
    el("p", { class: "lede" }, [
      "A live 2D explicit finite-difference heat solver (∂T/∂t = α∇²T + q_dyn + q_leak(T) − hΔT) runs on Kurnal's 140.57 mm² floorplan. Block watts are a model, not a measured phone power map. Toggle the 5,500 mm² Xiaomi 3D IceLoop vapor chamber off to watch the model's leakage term pull the DVFS clock down. The 20-minute axis is simulated time.",
    ]),
    readoutGrid([
      el("div", { class: "readout" }, [
        el("span", { class: "readout-label" }, ["Peak Junction T_j"]),
        el("span", { class: "readout-value" }, [peakVal, el("span", { class: "readout-unit" }, ["°C"])]),
        el("span", { class: "readout-sub" }, ["Live 2D FDTD silicon peak"]),
      ]),
      el("div", { class: "readout" }, [
        el("span", { class: "readout-label" }, ["C1-Ultra DVFS Clock"]),
        el("span", { class: "readout-value" }, [clkVal, el("span", { class: "readout-unit" }, ["GHz"])]),
        el("span", { class: "readout-sub" }, ["4.21 GHz nominal · ramps > 84 °C"]),
      ]),
      el("div", { class: "readout" }, [
        el("span", { class: "readout-label" }, ["SoC + Leakage Power"]),
        el("span", { class: "readout-value" }, [pwrVal, el("span", { class: "readout-unit" }, ["W"])]),
        el("span", { class: "readout-sub" }, ["Dynamic + exponential I_leak(T)"]),
      ]),
      el("div", { class: "readout" }, [
        el("span", { class: "readout-label" }, ["7,000 mAh Si-C Est."]),
        el("span", { class: "readout-value" }, [batVal, el("span", { class: "readout-unit" }, ["hrs"])]),
        el("span", { class: "readout-sub" }, [
          `Cited ${specs.device.battery_typical_mah.value} mAh, ${specs.device.battery_cell_voltage_v.value} V cell. Nominal Wh unpublished.`,
        ]),
      ]),
    ]),
    stage,
    el("div", { class: "hero-tools" }, [profileBar, ambCtrl.node, injectBtn]),
    el("div", { class: "grid cols-2" }, [
      panel(
        "Interactive 2D FLIR Die Map (Click / Drag to Inject Heat)",
        [flir2dHost, flirProbeLine],
        null,
        "KURNAL 10.88 × 12.92 MM FLOORPLAN",
      ),
      panel(
        "20-Min Sustained Thermal Throttling: 3D IceLoop ON vs OFF",
        [sustainedHost, zoneLedger],
        null,
        "COMPUTED PDE VS 75.6% STEEL NOMAD",
      ),
    ]),
  );

  // Mount 3D FLIR Die + Vapor Chamber Stage
  let view = null;
  let thermal3d = null;
  try {
    view = await mountView(canvas, cap);
    thermal3d = buildThermalDieStage(makeMaterials(cap.tier), thermalTex);
    view.root.add(thermal3d);
    view.frame(thermal3d, 0.88);
    view.orbit.pose(0.42, 0.92, true);
    view.enableProbe({
      onHover(info) {
        if (!info) {
          probeHud.hidden = true;
          return;
        }
        probeHud.hidden = false;
        probeHud.replaceChildren(
          el("span", { class: "probe-tag" }, [info.tag || "INSPECT"]),
          el("strong", {}, [info.title]),
          el("span", { class: "probe-detail" }, [info.detail]),
        );
      },
      onSelect() {
        audio?.sonify("probe", 0.6);
      },
    });
    view.setFrame((now) => {
      sim.step(0.06, 4);
      syncThermalTexture();
      thermal3d?.userData?.updateThermal3d?.(now * 0.001, vcEnabled);
    });
  } catch (err) {
    stage.append(note(`3D FLIR stage unavailable: ${err.message}`));
  }

  // Interactive 2D FLIR Canvas (p5.js 30 FPS)
  let hoverSample = null;
  const flirSketch = await mountSketch(
    flir2dHost,
    (p) => {
      p.background("#06090f");
      const margin = 16;
      const availW = p.width - margin * 2 - 46;
      const availH = p.height - margin * 2;
      const aspect = sim.widthMm / sim.heightMm;
      let drawW = availW;
      let drawH = drawW / aspect;
      if (drawH > availH) {
        drawH = availH;
        drawW = drawH * aspect;
      }
      const ox = margin + (availW - drawW) / 2;
      const oy = margin + (availH - drawH) / 2;
      const cw = drawW / sim.nx;
      const ch = drawH / sim.ny;

      // Paint ironbow PDE field
      p.noStroke();
      for (let j = 0; j < sim.ny; j++) {
        for (let i = 0; i < sim.nx; i++) {
          const [r, g, b] = ironbowRgb(sim.temp[j * sim.nx + i], 24, 108);
          p.fill(r, g, b);
          p.rect(ox + i * cw, oy + j * ch, cw + 0.6, ch + 0.6);
        }
      }

      // Draw Kurnal block outlines & live zone temperatures
      const st = sim.stats();
      for (const z of DIE_HEAT_ZONES) {
        const zx = ox + (z.x / sim.widthMm) * drawW;
        const zy = oy + (z.y / sim.heightMm) * drawH;
        const zw = (z.w / sim.widthMm) * drawW;
        const zh = (z.h / sim.heightMm) * drawH;
        p.noFill();
        p.stroke("rgba(232, 240, 255, 0.55)");
        p.strokeWeight(1);
        p.rect(zx, zy, zw, zh);
        p.noStroke();
        p.fill("rgba(6, 9, 15, 0.72)");
        p.rect(zx + 3, zy + 3, Math.min(zw - 6, 128), 16, 3);
        p.fill("#eef4ff");
        p.textSize(9.5);
        p.text(`${z.label} ${(st.zonePeaks[z.id] || 25).toFixed(1)}°C`, zx + 6, zy + 14);
      }

      // Right-hand Ironbow thermal scale bar (24°C -> 108°C)
      const barX = ox + drawW + 14;
      for (let k = 0; k < drawH; k++) {
        const temp = 108 - (k / drawH) * (108 - 24);
        const [r, g, b] = ironbowRgb(temp, 24, 108);
        p.stroke(r, g, b);
        p.line(barX, oy + k, barX + 12, oy + k);
      }
      p.noStroke();
      p.fill("#9fb0c8");
      p.textSize(9);
      p.text("108°", barX + 15, oy + 9);
      p.text("66°", barX + 15, oy + drawH / 2 + 3);
      p.text("24°", barX + 15, oy + drawH);

      // Interactive pointer probe & drag heat injection
      if (p.mouseX >= ox && p.mouseX <= ox + drawW && p.mouseY >= oy && p.mouseY <= oy + drawH) {
        const u = (p.mouseX - ox) / drawW;
        const v = (p.mouseY - oy) / drawH;
        hoverSample = sim.sampleAt(u, v);
        if (p.mouseIsPressed) sim.injectHotspot(u, v, 1.4, 3.2);
        p.stroke("rgba(56, 212, 242, 0.9)");
        p.strokeWeight(1);
        p.line(p.mouseX - 8, p.mouseY, p.mouseX + 8, p.mouseY);
        p.line(p.mouseX, p.mouseY - 8, p.mouseX, p.mouseY + 8);
      }
    },
    {
      height: 310,
      loop: true,
      fps: 30,
      mousePressed: (p) => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
          audio?.sonify("thermal", 0.78);
        }
      },
    },
  );

  // 20-Minute Sustained Throttling Comparison Chart
  const sustainedSketch = await mountSketch(
    sustainedHost,
    (p, state) => {
      p.background("#06090f");
      const pts = state.points || [];
      if (!pts.length) return;
      const padL = 42;
      const padR = 16;
      const padT = 24;
      const padB = 26;
      const w = p.width - padL - padR;
      const h = p.height - padT - padB;
      const xOf = (min) => padL + (min / 20) * w;
      const yOf = (pct) => padT + (1 - (Math.max(0.4, Math.min(1.05, pct / 100)) - 0.4) / 0.65) * h;

      // Grid lines (50%, 75%, 100%)
      p.stroke("rgba(255,255,255,0.08)");
      for (const pct of [50, 75, 100]) {
        const y = yOf(pct);
        p.line(padL, y, padL + w, y);
        p.noStroke();
        p.fill("#8799b4");
        p.textSize(9);
        p.text(`${pct}%`, 6, y + 3);
        p.stroke("rgba(255,255,255,0.08)");
      }

      // Cited Xiaomi 17T Pro Steel Nomad Light 75.6% stability benchmark line
      const yCited = yOf(75.6);
      p.stroke("rgba(251, 191, 36, 0.55)");
      p.drawingContext.setLineDash([4, 4]);
      p.line(padL, yCited, padL + w, yCited);
      p.drawingContext.setLineDash([]);
      p.noStroke();
      p.fill("#fbbf24");
      p.textSize(9);
      p.text("Cited 17T Pro Steel Nomad: 75.6%", padL + 6, yCited - 5);

      // 3D IceLoop ON curve (cyan)
      p.noFill();
      p.stroke("#38d4f2");
      p.strokeWeight(2.4);
      p.beginShape();
      for (const pt of pts) p.vertex(xOf(pt.minute), yOf(pt.vcPerfPct));
      p.endShape();

      // No Vapor Chamber curve (rose)
      p.stroke("#fb7185");
      p.strokeWeight(2);
      p.beginShape();
      for (const pt of pts) p.vertex(xOf(pt.minute), yOf(pt.noVcPerfPct));
      p.endShape();

      // Legend
      p.noStroke();
      p.fill("#38d4f2");
      p.textSize(10);
      p.text("— 3D IceLoop 5500 mm² VC ON", padL, 14);
      p.fill("#fb7185");
      p.text("— VC OFF (Throttle Cliff)", padL + 185, 14);
      p.fill("#8799b4");
      p.textSize(9);
      p.text("0 min", padL, p.height - 8);
      p.text("10 min", padL + w / 2 - 12, p.height - 8);
      p.text("20 min", padL + w - 28, p.height - 8);
    },
    { height: 210 },
  );

  function refreshSustainedChart() {
    const points = simulateSustainedThrottle({
      minutes: 20,
      ambientC: Number(ambCtrl.input.value),
      profileId: activeProfile,
    });
    sustainedSketch.setState({ points });
  }
  refreshSustainedChart();

  // Live telemetry readout ticker
  const ticker = window.setInterval(() => {
    if (!view) sim.step(0.08, 4);
    const st = sim.stats();
    peakVal.textContent = st.peakC.toFixed(1);
    peakVal.className = st.peakC > 85 ? "v-danger" : st.peakC > 68 ? "v-warn" : "v-cyan";
    clkVal.textContent = st.c1UltraGHz.toFixed(2);
    pwrVal.textContent = st.totalWatts.toFixed(2);
    batVal.textContent = st.batteryHrs == null ? "—" : st.batteryHrs.toFixed(1);

    if (hoverSample) {
      flirProbeLine.textContent = `PROBE: ${hoverSample.zone} · (${hoverSample.xMm.toFixed(2)}, ${hoverSample.yMm.toFixed(2)}) mm · ${hoverSample.tempC.toFixed(1)} °C — click/drag to inject hotspot`;
    }
    zoneLedger.replaceChildren(
      kv(
        "Cooling Hardware",
        el("span", {}, [
          `Xiaomi 3D IceLoop ${specs.device.cooling_vc_area_mm2.value} mm² `,
          provCited(specs.device.cooling_vc_area_mm2),
        ]),
      ),
      kv(
        "Thermal Stability",
        el("span", {}, [
          `CPU ${(st.throttleScale * 100).toFixed(1)}% · Mean die ${st.meanC.toFixed(1)} °C `,
          provComputed("Explicit 2D FDTD heat PDE + subthreshold I_leak(T)"),
        ]),
      ),
      kv(
        "PMIC & Charging Stack",
        el("span", {}, [
          `${specs.device.pmic.value} · ${specs.device.wired_charge_w.value} W wired / ${specs.device.wireless_charge_w.value} W wireless `,
          provCited(specs.device.wired_charge_w),
        ]),
      ),
    );
  }, 220);

  return {
    dispose() {
      window.clearInterval(ticker);
      flirSketch.dispose();
      sustainedSketch.dispose();
      thermalTex.dispose();
      view?.dispose();
    },
  };
}
