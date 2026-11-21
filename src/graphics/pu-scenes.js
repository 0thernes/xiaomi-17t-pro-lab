import * as THREE from "three";
import { aerialImage } from "../sim/lithography.js";
import { createPipeline } from "../sim/pipeline.js";
import { rasterizeTiles } from "../sim/tiler.js";
import { fillUnit, matmulQuantized, mulberry32, quantizeSymmetricInt8 } from "../sim/quant.js";
import { floorplan, getSpecs, npuCounts, parseDieMm, parsePackageMm } from "../specs.js";
import { buildDie, buildFinfet, buildPackage, buildQuantumField } from "./subjects.js";

const box = (w, h, d, material, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

function callout(text, width = 4.6) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 112;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(8, 12, 20, 0.9)";
  ctx.strokeStyle = "rgba(56, 212, 242, 0.58)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(6, 6, 1012, 100, 18);
  ctx.fill();
  ctx.stroke();
  let size = 38;
  ctx.font = `600 ${size}px monospace`;
  while (size > 18 && ctx.measureText(text).width > 940) {
    size -= 2;
    ctx.font = `600 ${size}px monospace`;
  }
  ctx.fillStyle = "#eef4ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 512, 56);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * (112 / 1024)),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, side: THREE.DoubleSide }),
  );
}

function sramGrid(material, cols, rows, pitch, origin) {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(pitch * 0.76, pitch * 0.28, pitch * 0.76),
    material,
    cols * rows,
  );
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      dummy.position.set(origin.x + x * pitch, origin.y, origin.z + y * pitch);
      dummy.updateMatrix();
      mesh.setMatrixAt(n++, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/** Elevated bus rail with animated glowing wave-packets. */
function busLine(start, end, material, count = 5) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 8), material);
  rail.position.copy(start).add(end).multiplyScalar(0.5);
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  group.add(rail);
  const packets = [];
  const geo = new THREE.SphereGeometry(0.13, 12, 10);
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, material);
    packets.push(p);
    group.add(p);
  }
  return {
    group,
    update(t, speed = 0.55) {
      for (let i = 0; i < packets.length; i++) {
        const u = (t * speed + i / packets.length) % 1;
        packets[i].position.lerpVectors(start, end, u);
      }
    },
  };
}

export function scenePackage(materials) {
  const group = new THREE.Group();
  const pkg = buildPackage(materials);
  pkg.rotation.x = -Math.PI / 2;
  group.add(pkg);
  const note =
    "MT6993Z HB-MUFPOP (16.40 × 14.00 × 0.455 mm, 0.35 mm pitch) with stacked SK hynix H58GG6AV9H 12 GB LPDDR5X-9600 (4×16-bit PoP).";
  return {
    group,
    note,
    update(dt) {
      group.rotation.y += dt * 0.14;
    },
  };
}

export function sceneFloor(materials) {
  const group = buildDie(materials);
  const b1 = busLine(
    new THREE.Vector3(-4.2, 2.2, 0.55),
    new THREE.Vector3(4.2, 2.2, 0.55),
    materials.cyan || materials.accent,
    6,
  );
  const b2 = busLine(new THREE.Vector3(-4.2, -1.8, 0.55), new THREE.Vector3(4.2, -1.8, 0.55), materials.accent, 6);
  const b3 = busLine(
    new THREE.Vector3(0, -5.2, 0.55),
    new THREE.Vector3(0, 5.2, 0.55),
    materials.violet || materials.gold,
    6,
  );
  group.add(b1.group, b2.group, b3.group);
  return {
    group,
    note: "Dimensity 9500 (10.88 × 12.92 = 140.57 mm², ~30B transistors). Block areas match Kurnal's decap report; live packets trace coherent DSU/L3/SLC fabric buses.",
    update() {
      const t = performance.now() * 0.001;
      b1.update(t, 0.5);
      b2.update(t, 0.72);
      b3.update(t, 0.44);
    },
  };
}

export function scenePipeline(materials) {
  const group = new THREE.Group();
  group.add(box(18.5, 0.3, 6.2, materials.substrate, 0, -1.1, 0));
  const names = ["Fetch (L1I)", "Decode (10w)", "Rename / OoO", "Issue (23p)", "Execute / WB"];
  const mats = [
    materials.cyan || materials.silicon,
    materials.accent,
    materials.violet || materials.copper,
    materials.gold,
    materials.silicon,
  ];
  const stages = names.map((name, i) => {
    const x = i * 3.5 - 7.0;
    const base = box(2.5, 1.5, 2.4, mats[i], x, -0.2, 0);
    const cap = box(2.6, 0.16, 2.5, materials.frame, x, 0.65, 0);
    const tag = callout(name, 2.8);
    tag.position.set(x, 1.65, 0);
    group.add(base, cap, tag);
    return base;
  });

  const bus = busLine(
    new THREE.Vector3(-7.0, 0.9, 0),
    new THREE.Vector3(7.0, 0.9, 0),
    materials.cyan || materials.accent,
    9,
  );
  group.add(bus.group);

  const sim = createPipeline(
    [
      { op: "load", dst: 1, addr: 0 },
      { op: "add", dst: 2, a: 1, b: 1 },
      { op: "add", dst: 3, a: 2, b: 1 },
    ],
    { loadLatency: 3 },
  );
  let acc = 0;
  let last = null;
  return {
    group,
    note: "Live 5-stage pipeline simulation (stalls on load-use hazards) contextualizing Arm C1-Ultra's cited 10 MOP/cycle decode, 20 µOP/cycle dispatch, ~2K in-flight window, and 23 issue ports.",
    update(dt) {
      acc += dt;
      if (acc > 0.35) {
        acc = 0;
        last = sim.tick();
      }
      const t = performance.now() * 0.001;
      bus.update(t, last?.stalls ? 0.25 : 0.65);
      stages.forEach((mesh, idx) => {
        mesh.position.y = -0.2 + Math.sin(t * 3 + idx) * 0.06;
      });
    },
  };
}

export function sceneUltra(materials) {
  const specs = getSpecs();
  const group = new THREE.Group();
  // Silicon substrate deck with copper perimeter ring
  group.add(box(20, 0.36, 12, materials.substrate, 0, -0.5, 0));
  group.add(box(20.2, 0.12, 12.2, materials.pcb, 0, -0.72, 0));

  // 10-wide Decode front-end pipelines (glowing orange)
  const lanes = [];
  for (let i = 0; i < 10; i++) {
    const lane = box(0.72, 1.85, 0.9, materials.accent, -5.8 + i * 1.28, 0.62, 3.2);
    lanes.push(lane);
    group.add(lane);
  }
  // 23-port Execution Array (copper + cyan FP/ASIMD + violet SME2)
  for (let i = 0; i < 23; i++) {
    const isFp = i >= 11 && i < 17;
    const isLs = i >= 17;
    const mat = isFp
      ? materials.cyan || materials.accent
      : isLs
        ? materials.violet || materials.gold
        : materials.copper;
    group.add(box(0.28, 2.2, 0.48, mat, -7.2 + i * 0.65, 0.8, -3.4));
  }
  // 64 KB L1I + 128 KB L1D + 2 MB L2 banked 6T SRAM array
  group.add(sramGrid(materials.gold, 32, 16, 0.26, { x: -4.1, y: 0.05, z: -1.8 }));

  // Shared 512-bit SME2 matrix engine tile
  group.add(box(3.2, 1.1, 3.6, materials.violet || materials.silicon, 7.6, 0.25, -1.6));
  const smeLabel = callout("SME2 512b", 3.0);
  smeLabel.position.set(7.6, 1.85, -1.6);
  group.add(smeLabel);

  // Scaled 48 nm FinFET edge + 23 nm BEOL stack
  for (let i = 0; i < 6; i++) {
    group.add(box(0.14, 1.1, 2.6, materials.silicon, -8.6 + i * 0.3, 0.35, 3.0));
  }
  group.add(box(2.1, 0.25, 0.45, materials.copper, -7.85, 1.05, 3.0));

  // Live micro-op wave-packets streaming from 10-wide Decode -> SRAM -> 23 Issue Ports
  const b1 = busLine(new THREE.Vector3(-5.8, 1.8, 3.2), new THREE.Vector3(5.8, 1.8, 3.2), materials.accent, 8);
  const b2 = busLine(
    new THREE.Vector3(-4.0, 0.6, 2.5),
    new THREE.Vector3(-4.0, 0.6, -3.0),
    materials.cyan || materials.accent,
    5,
  );
  const b3 = busLine(
    new THREE.Vector3(4.0, 0.6, 2.5),
    new THREE.Vector3(4.0, 0.6, -3.0),
    materials.cyan || materials.accent,
    5,
  );
  group.add(b1.group, b2.group, b3.group);

  const topTag = callout("C1-Ultra · 10-Wide Decode · 23 Issue Ports · L1 64/128 KB", 9.6);
  topTag.position.set(0, 3.4, -3.4);
  group.add(topTag);

  const text = specs.soc.c1_ultra_frontend_width?.value || "10 MOPs/cycle decode";
  return {
    group,
    note: `Arm C1-Ultra reconstruction (3.259 mm², 4.21 GHz). Cited: ${text}; L1I 64 KB / L1D 128 KB / L2 2 MB; SVE2 128b + shared SME2 512b. Live packets pulse decode→issue traffic.`,
    update() {
      const t = performance.now() * 0.001;
      b1.update(t, 0.55);
      b2.update(t, 0.8);
      b3.update(t + 0.35, 0.8);
      lanes.forEach((l, i) => {
        l.scale.y = 0.82 + 0.28 * Math.sin(t * 4.5 + i * 0.7);
      });
    },
  };
}

export function sceneCache(materials) {
  const group = new THREE.Group();
  const levels = [
    { name: "L1D · 128 KB (C1-Ultra)", y: 3.6, w: 4.2, d: 2.6, mat: materials.cyan || materials.gold },
    { name: "L2 · 2 MB Private", y: 1.4, w: 6.4, d: 3.2, mat: materials.accent },
    { name: "L3 · 16 MB Shared DSU", y: -0.9, w: 9.0, d: 4.0, mat: materials.violet || materials.frame },
    { name: "SLC · 10 MB System Cache", y: -3.2, w: 11.4, d: 4.6, mat: materials.copper },
    { name: "LPDDR5X-9600 · 76.8 GB/s", y: -5.4, w: 13.6, d: 5.2, mat: materials.silicon },
  ];
  for (const lv of levels) {
    group.add(box(lv.w, 0.55, lv.d, lv.mat, 0, lv.y, 0));
    const tag = callout(lv.name, 4.8);
    tag.position.set(lv.w / 2 + 2.8, lv.y, 0);
    group.add(tag);
  }
  const bus = busLine(
    new THREE.Vector3(0, 3.8, 0),
    new THREE.Vector3(0, -5.4, 0),
    materials.cyan || materials.accent,
    10,
  );
  group.add(bus.group);

  return {
    group,
    note: "Dimensity 9500 memory hierarchy from L1D (128 KB) down to 16 MB L3, 10 MB SLC, and 76.8 GB/s SK hynix LPDDR5X-9600. Packet velocity adapts live to your measured pointer-chase ns/load.",
    update(dt, data) {
      const ns = data?.points?.[data.points.length - 1]?.nsPerLoad || 12;
      const speed = Math.max(0.2, Math.min(1.4, 6 / Math.max(2, ns)));
      const t = (group.userData.t = (group.userData.t || 0) + dt * speed);
      bus.update(t, 1);
    },
  };
}

export function sceneSram(materials) {
  const group = new THREE.Group();
  group.add(box(14, 0.25, 8, materials.substrate, 0, -1.2, 0));
  group.add(sramGrid(materials.silicon, 24, 12, 0.42, { x: -4.8, y: -0.95, z: -2.4 }));
  // Hero 6T SRAM bitcell elevated above array
  const cell = new THREE.Group();
  cell.position.set(0, 1.4, 0);
  for (let i = 0; i < 6; i++) {
    const isPass = i === 0 || i === 5;
    cell.add(
      box(0.55, 1.15, 0.45, isPass ? materials.accent : materials.cyan || materials.silicon, (i - 2.5) * 0.9, 0, 0),
    );
  }
  cell.add(box(5.8, 0.12, 0.14, materials.gold, 0, 0.95, 0)); // Wordline WL
  cell.add(box(5.8, 0.12, 0.14, materials.copper, 0, -0.95, 0.5)); // BL / BLB
  cell.add(box(5.8, 0.12, 0.14, materials.copper, 0, -0.95, -0.5));
  const tag = callout("6T SRAM Bitcell · WL / BL / Cross-Coupled Inverters", 8.2);
  tag.position.set(0, 3.2, 0);
  group.add(cell, tag);
  return {
    group,
    note: "6T SRAM array (2 pull-up PMOS, 2 pull-down NMOS, 2 pass gates). Used across L1/L2/L3/SLC and NPU 7 MiB L1 / 4 MiB L2 buffers.",
    update() {
      cell.position.y = 1.4 + Math.sin(performance.now() * 0.003) * 0.16;
    },
  };
}

export function sceneFinfet(materials, opts = {}) {
  const group = buildFinfet(materials, opts);
  // Side-by-side TSMC N2 3-ribbon GAA Nanosheet comparison
  const gaa = new THREE.Group();
  gaa.position.set(13.5, 0, 0);
  gaa.add(box(5.8, 1.4, 8.6, materials.substrate, 0, -2.1, 0));
  for (let i = 0; i < 3; i++) {
    gaa.add(box(4.6, 0.34, 6.8, materials.violet || materials.accent, 0, -0.4 + i * 0.92, 0));
    gaa.add(box(4.9, 0.54, 2.3, materials.hfo2 || materials.cyan, 0, -0.4 + i * 0.92, 0));
  }
  gaa.add(box(5.2, 3.3, 1.8, materials.copper, 0, 0.65, 0));
  const gaaTag = callout("TSMC N2 GAA Nanosheet (Contrast Only)", 6.4);
  gaaTag.position.set(0, 4.4, 0);
  gaa.add(gaaTag);
  group.add(gaa);

  return {
    group,
    note: "Left: Dimensity 9500 TSMC N3P FinFET (48 nm CPP, 23 nm M0, tri-gate wrap + HfO₂ high-k dielectric + live channel electron drift). Right: TSMC N2 3-ribbon GAA nanosheet contrast.",
    update(dt) {
      group.traverse((obj) => {
        if (obj.userData.drift) {
          obj.position.z += dt * obj.userData.drift.speed;
          if (obj.position.z > 3.5) obj.position.z = -3.5;
        }
      });
    },
  };
}

export function sceneBeol(materials) {
  const group = new THREE.Group();
  const pitches = [23, 28, 36, 48, 64, 84, 110, 150];
  pitches.forEach((pitch, i) => {
    const horizontal = i % 2 === 0;
    const count = Math.max(3, 10 - i);
    for (let k = 0; k < count; k++) {
      const offset = (k - (count - 1) / 2) * (0.42 + i * 0.16);
      const bar = box(
        horizontal ? 8.5 : 0.16 + i * 0.06,
        0.16 + i * 0.03,
        horizontal ? 0.16 + i * 0.06 : 8.5,
        i === 0 ? materials.gold : i < 4 ? materials.copper : materials.frame,
        horizontal ? 0 : offset,
        i * 0.62 - 2.0,
        horizontal ? offset : 0,
      );
      group.add(bar);
    }
  });
  const tag = callout("BEOL Copper Interconnect Stack · M0 23 nm → Global Power", 8.8);
  tag.position.set(0, 3.6, 0);
  group.add(tag);
  return {
    group,
    note: "Orthogonal BEOL metal routing stack anchored on N3E/N3P's cited 23 nm M0 minimum pitch scaling upward to thicker low-resistance global power distribution layers.",
    update(dt) {
      group.rotation.y += dt * 0.18;
    },
  };
}

/** 3D ASML NXE 0.33 NA EUV Lithography Column + Sn Plasma + Bragg Mirrors + Wafer. */
export function sceneLitho(materials) {
  const group = new THREE.Group();
  // 1. Sn droplet plasma source (13.5 nm = 91.84 eV)
  const plasma = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 16), materials.cyan || materials.accent);
  plasma.position.set(-6.2, 3.6, 0);
  group.add(plasma);
  const collector = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45),
    materials.gold,
  );
  collector.rotation.z = -Math.PI * 0.65;
  collector.position.set(-6.7, 4.1, 0);
  group.add(collector);

  // 2. Reflective photomask reticle (4x magnification)
  const reticle = box(3.6, 0.2, 3.6, materials.die, 0, 4.4, 0);
  group.add(reticle);

  // 3. Mo/Si 40-pair Bragg multilayer projection optics mirrors
  const m1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.25, 36), materials.frame);
  m1.position.set(2.4, 1.8, 0);
  m1.rotation.z = 0.55;
  const m2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.25, 36), materials.frame);
  m2.position.set(-1.4, -0.4, 0);
  m2.rotation.z = -0.42;
  group.add(m1, m2);

  // 4. 300 mm Silicon Wafer & Live 3D Abbe Aerial Image Intensity Profile
  const wafer = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.22, 48), materials.silicon);
  wafer.position.set(0, -3.2, 0);
  group.add(wafer);

  const image = aerialImage({ na: 0.33, pitchNm: 40, sigma: 0.5, n: 64, periods: 3 });
  for (let i = 0; i < image.intensity.length; i++) {
    const h = 0.1 + image.intensity[i] * 1.4;
    group.add(box(0.09, h, 2.6, materials.accent, -3.2 + (i / 63) * 6.4, -3.0 + h / 2, 0));
  }

  // Live 13.5 nm EUV photon beam paths bouncing through reflective vacuum optics
  const b1 = busLine(
    new THREE.Vector3(-6.2, 3.6, 0),
    new THREE.Vector3(0, 4.3, 0),
    materials.cyan || materials.accent,
    6,
  );
  const b2 = busLine(
    new THREE.Vector3(0, 4.3, 0),
    new THREE.Vector3(2.4, 1.8, 0),
    materials.violet || materials.cyan,
    5,
  );
  const b3 = busLine(
    new THREE.Vector3(2.4, 1.8, 0),
    new THREE.Vector3(-1.4, -0.4, 0),
    materials.violet || materials.cyan,
    5,
  );
  const b4 = busLine(new THREE.Vector3(-1.4, -0.4, 0), new THREE.Vector3(0, -2.9, 0), materials.accent, 5);
  group.add(b1.group, b2.group, b3.group, b4.group);

  const tag = callout("EUV 13.5 nm · Sn LPP → Mo/Si Bragg → 0.33 NA Wafer", 9.0);
  tag.position.set(0, 5.8, 0);
  group.add(tag);

  return {
    group,
    note: `Live 13.5 nm EUV reflective optical train (NA 0.33) projecting Abbe aerial image (contrast ${image.contrast.toFixed(3)}) onto resist wafer. Open the EUV Litho tab for Bragg reflectivity, defocus, and photon shot noise.`,
    update() {
      const t = performance.now() * 0.001;
      b1.update(t, 0.9);
      b2.update(t, 0.9);
      b3.update(t, 0.9);
      b4.update(t, 0.9);
      plasma.scale.setScalar(0.92 + 0.15 * Math.sin(t * 14));
    },
  };
}

export function sceneWave(materials) {
  const group = buildQuantumField(materials);
  return {
    group,
    note: "Complex quantum wavefunction ψ(x,t) tunneling through an ultra-thin oxide barrier alongside counter-rotating relativistic Dirac e⁻ / e⁺ trajectories.",
    update() {
      group.userData.animateQuantum?.(performance.now() * 0.001);
    },
  };
}

export function sceneTiler(materials) {
  const shaded = rasterizeTiles(
    [
      { x0: 2, y0: 2, x1: 28, y1: 5, x2: 6, y2: 26, r: 255, g: 105, b: 0 },
      { x0: 10, y0: 8, x1: 30, y1: 30, x2: 16, y2: 4, r: 56, g: 212, b: 242 },
    ],
    { width: 32, height: 32, tileSize: 8 },
  );
  const group = new THREE.Group();
  group.add(box(7.2, 0.25, 7.2, materials.substrate, 0, -0.35, 0));
  const tiles = shaded.tilesX * shaded.tilesY;
  const cells = [];
  for (let i = 0; i < tiles; i++) {
    const x = i % shaded.tilesX;
    const y = Math.floor(i / shaded.tilesX);
    const count = shaded.bins[i].length;
    const h = 0.22 + count * 0.95;
    const m = box(
      1.25,
      h,
      1.25,
      count >= 2 ? materials.accent : count === 1 ? materials.cyan || materials.gold : materials.silicon,
      (x - 1.5) * 1.48,
      h / 2 - 0.15,
      (y - 1.5) * 1.48,
    );
    cells.push({ m, count });
    group.add(m);
  }
  const tag = callout(`TBDR Live Tile Binning · ${shaded.touched} Bins · ${shaded.shaded} px`, 7.2);
  tag.position.set(0, 3.2, 0);
  group.add(tag);
  return {
    group,
    note: `Live Deferred Vertex Shading & Tile-Based Deferred Rendering binner (${shaded.touched} active tiles, ${shaded.shaded} shaded pixels). Column height = triangle depth per tile.`,
    update() {
      const t = performance.now() * 0.003;
      cells.forEach(({ m, count }, idx) => {
        if (count > 0) m.position.y = (0.22 + count * 0.95) / 2 - 0.15 + Math.sin(t + idx) * 0.07;
      });
    },
  };
}

export function sceneGpuCore(materials) {
  const shaded = rasterizeTiles(
    [
      { x0: 2, y0: 2, x1: 30, y1: 6, x2: 8, y2: 28, r: 255, g: 105, b: 0 },
      { x0: 12, y0: 10, x1: 30, y1: 30, x2: 18, y2: 4, r: 56, g: 212, b: 242 },
    ],
    { width: 32, height: 32, tileSize: 8 },
  );
  const group = new THREE.Group();
  group.add(box(15.2, 0.34, 10.6, materials.substrate, 0, -0.45, 0));
  group.add(box(15.5, 0.14, 10.9, materials.pcb, 0, -0.68, 0));

  // 12 Mali-G1 Ultra MC12 Shader Cores (3x4 array, 1.55 mm² each) + RTUv2 ray-tracing engines
  const cores = [];
  for (let i = 0; i < 12; i++) {
    const cx = (i % 4) * 2.5 - 3.75;
    const cz = Math.floor(i / 4) * 2.1 - 2.6;
    const core = box(2.05, 0.85, 1.65, materials.silicon, cx, 0.15, cz);
    const rtu = box(1.85, 0.16, 0.32, materials.cyan || materials.accent, cx, 0.65, cz + 0.48);
    const alu = box(1.85, 0.16, 0.65, materials.copper, cx, 0.65, cz - 0.25);
    cores.push({ core, rtu });
    group.add(core, rtu, alu);
  }

  // 2 MiB L2 Cache Fabric Bar across rear
  group.add(box(10.6, 0.55, 1.2, materials.gold, 0, 0.05, -4.3));
  const l2Tag = callout("2 MiB GPU L2 + CSF", 4.6);
  l2Tag.position.set(0, 1.25, -4.3);
  group.add(l2Tag);

  // Live RTUv2 ray-tracing beams + TBDR elevated tile-binning grid in front
  const ray1 = busLine(
    new THREE.Vector3(-4.2, 1.2, -2.5),
    new THREE.Vector3(3.8, 1.4, 3.2),
    materials.cyan || materials.accent,
    6,
  );
  const ray2 = busLine(new THREE.Vector3(4.0, 1.2, -2.0), new THREE.Vector3(-3.6, 1.3, 3.4), materials.accent, 6);
  group.add(ray1.group, ray2.group);

  const tiles = shaded.tilesX * shaded.tilesY;
  for (let i = 0; i < tiles; i++) {
    const x = i % shaded.tilesX;
    const y = Math.floor(i / shaded.tilesX);
    const count = shaded.bins[i].length;
    const h = 0.18 + count * 0.42;
    group.add(
      box(
        0.56,
        h,
        0.56,
        count ? materials.accent : materials.silicon,
        (x - 1.5) * 0.72,
        h / 2 - 0.18,
        2.85 + (y - 1.5) * 0.72,
      ),
    );
  }

  const topTag = callout("Arm Mali-G1 Ultra MC12 · 12 Shader Cores · RTUv2 · 24.23 mm²", 10.6);
  topTag.position.set(0, 2.9, -4.3);
  group.add(topTag);

  return {
    group,
    note: `12 Mali-G1 Ultra shader cores (1.55 mm² each, 256 FP32 ops/core/clk), 2 MiB L2, RTUv2 ray-tracing beams, and live TBDR tile bins (${shaded.touched} touched, ${shaded.shaded} px shaded).`,
    update() {
      const t = performance.now() * 0.001;
      ray1.update(t, 0.85);
      ray2.update(t + 0.4, 0.78);
    },
  };
}

export function sceneNpu(materials) {
  const counts = npuCounts();
  const n = 8;
  const rng = mulberry32(9);
  const A = fillUnit(n * n, rng);
  const B = fillUnit(n * n, rng);
  const aq = quantizeSymmetricInt8(A);
  const bq = quantizeSymmetricInt8(B);
  const C = matmulQuantized(aq.q, aq.scale, bq.q, bq.scale, n);
  let max = 1e-6;
  for (const v of C) max = Math.max(max, Math.abs(v));

  const group = new THREE.Group();
  group.add(box(17.2, 0.32, 11.4, materials.substrate, 0, -0.45, 0));
  group.add(box(17.5, 0.14, 11.7, materials.pcb, 0, -0.68, 0));

  // 8x8 Live INT8 Systolic MAC Tensor Array (right side)
  const cells = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const mag = Math.abs(C[y * n + x]) / max;
      const h = 0.24 + mag * 1.95;
      const mat = (x + y) % 2 === 0 ? materials.accent.clone() : (materials.violet || materials.accent).clone();
      const mesh = box(0.68, h, 0.68, mat, 2.2 + (x - n / 2 + 0.5) * 0.85, h / 2 - 0.2, (y - n / 2 + 0.5) * 0.85);
      mesh.userData.mag = mag;
      cells.push(mesh);
      group.add(mesh);
    }
  }

  // 4x MDLA Deep Learning Accelerators (1.811 mm² each) + 2x MVPU + 7 MiB L1 / 4 MiB L2 SRAM
  for (let i = 0; i < (counts.mdla || 4); i++) {
    group.add(box(2.4, 0.85, 1.35, materials.silicon, -5.8, 0.15, -3.2 + i * 1.85));
    group.add(box(2.2, 0.16, 1.15, materials.cyan || materials.gold, -5.8, 0.65, -3.2 + i * 1.85));
  }
  for (let i = 0; i < (counts.mvpu || 2); i++) {
    group.add(box(1.5, 0.72, 1.8, materials.copper, -3.2, 0.1, -2.4 + i * 3.2));
  }
  group.add(sramGrid(materials.gold, 16, 12, 0.28, { x: -4.4, y: -0.18, z: 2.2 }));

  const b1 = busLine(
    new THREE.Vector3(-4.6, 0.7, -1.0),
    new THREE.Vector3(5.6, 0.7, -1.0),
    materials.cyan || materials.accent,
    7,
  );
  const b2 = busLine(new THREE.Vector3(-4.6, 0.7, 1.2), new THREE.Vector3(5.6, 0.7, 1.2), materials.accent, 7);
  group.add(b1.group, b2.group);

  const topTag = callout(`NPU 990 · ${counts.mdla}× MDLA + ${counts.mvpu}× MVPU + CIM · Live INT8 Array`, 10.6);
  topTag.position.set(0, 3.3, -4.6);
  group.add(topTag);

  return {
    group,
    note: `${counts.mdla} MDLA + ${counts.mvpu} MVPU + 4 MiB L2 + CIM Super Efficient NPU (12.60 mm²). Column heights & sweeping wave show a live INT8 systolic product computed in JS/WASM (not dispatched to NPU 990).`,
    update() {
      const t = performance.now() * 0.001;
      const sweep = (t * 2.2) % n;
      b1.update(t, 0.85);
      b2.update(t + 0.5, 0.85);
      cells.forEach((cell, i) => {
        const col = i % n;
        const near = 1 - Math.min(1, Math.abs(col - sweep) / 2.2);
        cell.material.emissiveIntensity = 0.22 + cell.userData.mag * (0.45 + near * 1.2);
      });
    },
  };
}

const CPU_SCENE = {
  cpu_l1_software: "pipeline",
  cpu_l2_os: "pipeline",
  cpu_l3_isa: "pipeline",
  cpu_l4_dsu: "floor",
  cpu_l5_cores: "ultra",
  cpu_l6_uarch: "ultra",
  cpu_l7_frontend: "pipeline",
  cpu_l8_fu: "pipeline",
  cpu_l9_sme2: "ultra",
  cpu_l10_cache: "cache",
  cpu_l11_mmu: "cache",
  cpu_l12_circuit: "sram",
  cpu_l13_finfet: "finfet",
  cpu_l14_litho: "litho",
  cpu_l15_quantum: "wave",
};

const GPU_SCENE = {
  gpu_l1_api: "tiler",
  gpu_l2_driver: "tiler",
  gpu_l3_csf: "tiler",
  gpu_l4_queues: "tiler",
  gpu_l5_mc12: "gpu",
  gpu_l6_tbdr: "tiler",
  gpu_l7_warp: "gpu",
  gpu_l8_alu: "gpu",
  gpu_l9_rtu: "gpu",
  gpu_l10_cache: "cache",
  gpu_l11_display: "tiler",
  gpu_l12_circuit: "sram",
  gpu_l13_finfet: "finfet",
  gpu_l14_litho: "litho",
  gpu_l15_quantum: "wave",
  gpu_l16_thermal: "beol",
};

const NPU_SCENE = {
  npu_l1_api: "npu",
  npu_l2_runtime: "npu",
  npu_l3_ir: "npu",
  npu_l4_dual: "npu",
  npu_l5_990: "npu",
  npu_l6_cim: "npu",
  npu_l7_bitnet: "npu",
  npu_l8_xbar: "package",
  npu_l9_weights: "cache",
  npu_l10_circuit: "sram",
  npu_l11_finfet: "finfet",
  npu_l12_litho: "litho",
  npu_l13_quantum: "wave",
  npu_l14_privacy: "package",
};

export function sceneFor(engine, levelId, materials) {
  const table = engine === "gpu" ? GPU_SCENE : engine === "npu" ? NPU_SCENE : CPU_SCENE;
  const key = table[levelId] || "package";
  if (key === "package") return scenePackage(materials);
  if (key === "floor") return sceneFloor(materials);
  if (key === "pipeline") return scenePipeline(materials);
  if (key === "ultra") return sceneUltra(materials);
  if (key === "cache") return sceneCache(materials);
  if (key === "sram") return sceneSram(materials);
  if (key === "finfet") return sceneFinfet(materials);
  if (key === "beol") return sceneBeol(materials);
  if (key === "litho") return sceneLitho(materials);
  if (key === "wave") return sceneWave(materials);
  if (key === "tiler") return sceneTiler(materials);
  if (key === "gpu") return sceneGpuCore(materials);
  return sceneNpu(materials);
}
