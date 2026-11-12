import * as THREE from "three";
import { aerialImage } from "../sim/lithography.js";
import { createPipeline } from "../sim/pipeline.js";
import { rasterizeTiles } from "../sim/tiler.js";
import { fillUnit, matmulQuantized, mulberry32, quantizeSymmetricInt8 } from "../sim/quant.js";
import { floorplan, getSpecs, npuCounts, parseDieMm, parsePackageMm } from "../specs.js";

const box = (w, h, d, material, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

function bars(values, material, scale) {
  const group = new THREE.Group();
  const max = Math.max(...values, 1e-6);
  values.forEach((value, i) => {
    const h = 0.15 + (value / max) * scale;
    group.add(box(0.35, h, 0.35, material, (i - values.length / 2) * 0.42, h / 2, 0));
  });
  return group;
}

/** PoP as published. TSV and hybrid bonding are context, not a claim for this phone. */
export function scenePackage(materials) {
  const specs = getSpecs();
  const pkg = parsePackageMm(specs);
  const die = parseDieMm(specs);
  const group = new THREE.Group();
  const w = pkg?.widthMm || 16.4;
  const h = pkg?.heightMm || 14;
  const thick = pkg?.thickMm || 0.455;
  group.add(box(w, h, Math.max(thick, 0.35), materials.substrate, 0, 0, 0));
  const pitch = 0.35;
  const cols = Math.min(28, Math.floor((w - 0.6) / pitch));
  const rows = Math.min(24, Math.floor((h - 0.6) / pitch));
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), materials.gold, cols * rows);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      dummy.position.set(-w / 2 + 0.5 + i * pitch, -h / 2 + 0.5 + j * pitch, -thick / 2 - 0.12);
      dummy.updateMatrix();
      balls.setMatrixAt(n++, dummy.matrix);
    }
  }
  balls.count = n;
  group.add(balls);
  if (die) group.add(box(die.widthMm * 0.92, die.heightMm * 0.92, 0.2, materials.die, 0, 0, thick / 2 + 0.2));
  group.add(box(w * 0.82, h * 0.78, 0.28, materials.accent, 0, 0, thick / 2 + 0.55));
  const note =
    "PoP DRAM over the SoC, flip-chip balls at the cited 0.35 mm pitch. InFO is not evidenced. TSVs and hybrid bonding are not claimed for this phone.";
  return { group, note, update() {} };
}

export function sceneFloor(materials) {
  const plan = floorplan();
  const die = parseDieMm();
  const group = new THREE.Group();
  if (!plan || !die) return { group, note: "Die size is missing.", update() {} };
  group.add(box(die.widthMm, die.heightMm, 0.18, materials.die, 0, 0, 0));
  const colors = { cpu: 0xc4552a, gpu: 0x3d6ea8, npu: 0x7a5aaa };
  for (const block of plan.blocks) {
    group.add(
      box(
        block.widthMm * 0.94,
        block.heightMm * 0.88,
        0.16,
        new THREE.MeshStandardMaterial({
          color: colors[block.id],
          roughness: 0.45,
          metalness: 0.3,
          map: materials.die.map,
        }),
        block.xMm + block.widthMm / 2 - die.widthMm / 2,
        block.yMm + block.heightMm / 2 - die.heightMm / 2,
        0.16,
      ),
    );
  }
  for (let i = -4; i <= 4; i++) {
    group.add(box(die.widthMm * 0.9, 0.08, 0.04, materials.gold, 0, i * (die.heightMm / 10), 0.28));
  }
  return {
    group,
    note: "Block areas are Kurnal’s. Positions preserve those areas and are not a trace of the copyrighted die photo. The gold straps are a reconstructed power grid, not a published mesh.",
    update() {},
  };
}

function stageLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(12, 11, 10, 0.8)";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#f4efe8";
  ctx.font = "600 28px sans-serif";
  ctx.fillText(text, 16, 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
  );
  return plate;
}

export function scenePipeline(materials) {
  const group = new THREE.Group();
  const names = ["Fetch", "Decode", "Issue", "Execute", "Write"];
  const tones = [0xc9a15b, 0xd7d3cc, 0xb87333, 0x8ea0b5, 0xe8e2d8];
  const stages = names.map((name, i) => {
    const metal = new THREE.MeshPhysicalMaterial({
      color: tones[i],
      metalness: 0.85,
      roughness: 0.28,
      clearcoat: 0.4,
      emissive: 0xff7a1a,
      emissiveIntensity: 0.08,
    });
    const mesh = box(2.2, 1.5, 1.8, metal, i * 3.4 - 6.8, 0, 0);
    mesh.name = name;
    group.add(mesh);
    const plate = stageLabel(name);
    plate.position.set(mesh.position.x, 1.35, 1.05);
    group.add(plate);
    return mesh;
  });
  const token = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), materials.accent);
  group.add(token);
  const trail = [];
  for (let i = 0; i < 6; i++) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), materials.accent.clone());
    bead.material.emissiveIntensity = 0.2 + i * 0.08;
    trail.push(bead);
    group.add(bead);
  }
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
    note: "Five-stage in-order model. A dependent load stalls. C1-Ultra’s cited decode is 10 MOPs/cycle and 23 issue ports. This animation is not that microarchitecture.",
    update(dt) {
      acc += dt;
      if (acc > 0.35) {
        acc = 0;
        last = sim.tick();
      }
      const occupied = last?.occupied?.[0];
      const index = occupied ? names.findIndex((name) => name.toLowerCase().startsWith(occupied.stage.slice(0, 3))) : 0;
      const x = Math.max(0, index) * 3.4 - 6.8;
      token.position.x += (x - token.position.x) * Math.min(1, dt * 4);
      token.position.y = 1.35;
      trail.forEach((bead, i) => {
        bead.position.x = token.position.x - (i + 1) * 0.45;
        bead.position.y = 1.35;
        bead.position.z = 0.2;
      });
    },
  };
}

function sramGrid(material, cols, rows, pitch, origin) {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(pitch * 0.72, pitch * 0.22, pitch * 0.72),
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

function callout(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(12,11,10,0.8)";
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = "#f4efe8";
  ctx.font = "600 36px sans-serif";
  ctx.fillText(text, 16, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.64),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
  );
}

function streak(materials, count) {
  const beads = [];
  for (let i = 0; i < count; i++) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), materials.accent.clone());
    bead.material.emissiveIntensity = 0.7 + (i % 4) * 0.2;
    beads.push(bead);
  }
  return beads;
}

const EYE = {
  cpu: { theta: 0.22, phi: 1.42, radius: 8.5, target: [0.4, 2.4, 1] },
  gpu: { theta: 0.35, phi: 1.38, radius: 7.5, target: [0, 2.2, 4] },
  npu: { theta: -0.2, phi: 1.4, radius: 8, target: [1, 3.2, 0] },
};

export function sceneUltra(materials) {
  const specs = getSpecs();
  const group = new THREE.Group();
  const laneMat = new THREE.MeshPhysicalMaterial({
    color: 0xff7a1a,
    metalness: 0.2,
    roughness: 0.3,
    emissive: 0xff7a1a,
    emissiveIntensity: 0.8,
  });
  for (let i = 0; i < 10; i++) group.add(box(0.55, 7.5, 0.55, laneMat, -6 + i * 0.7, 3.6, -6));
  for (let i = 0; i < 12; i++) {
    const h = 9 + (i % 3);
    group.add(box(0.22, h, 6.5, materials.silicon, -4.2 + i * 0.42, h / 2, 2));
  }
  group.add(box(0.35, 0.45, 6.8, materials.frame, -1.9, 4.2, 2));
  for (let i = 0; i < 8; i++) {
    group.add(box(7.5, 0.16, 4.2, i === 0 ? materials.gold : materials.copper, 6.5, 0.4 + i * 1.15, -1));
  }
  const wall = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.28, 0.12), materials.gold, 18 * 10);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 18; x++) {
      dummy.position.set(-7.2 + x * 0.36, 0.6 + y * 0.4, 6.2);
      dummy.updateMatrix();
      wall.setMatrixAt(n++, dummy.matrix);
    }
  }
  group.add(wall);
  const packets = streak(materials, 14);
  packets.forEach((bead) => group.add(bead));
  const metalLabel = callout("23 nm metal, scaled");
  metalLabel.position.set(6.5, 5.2, 1.4);
  const finLabel = callout("48 nm fins");
  finLabel.position.set(-1.8, 5.4, 5.2);
  group.add(metalLabel, finLabel);
  const sim = createPipeline(
    [
      { op: "load", dst: 1, addr: 0 },
      { op: "add", dst: 2, a: 1, b: 1 },
    ],
    { loadLatency: 3 },
  );
  let acc = 0;
  const text = specs.soc.c1_ultra_frontend_width?.value || "10-wide decode";
  group.traverse((obj) => {
    obj.castShadow = false;
    obj.receiveShadow = false;
  });
  return {
    group,
    eye: EYE.cpu,
    note: `Inside a C1-Ultra reconstruction. Cited: ${text}. L1I ${specs.soc.l1i_kb_c1_ultra.value} KB, L1D ${specs.soc.l1d_kb_c1_ultra.value} KB. The tall orange posts are the 10-wide decode. The fins are a scaled 48 nm gate pitch. The copper sheets are a scaled 23 nm metal stack. Packets follow a live in-order pipeline. Not a die photo.`,
    update(dt) {
      acc += dt;
      if (acc > 0.28) {
        acc = 0;
        sim.tick();
      }
      const t = performance.now() * 0.001;
      packets.forEach((bead, i) => {
        const u = (t * 0.22 + i / packets.length) % 1;
        bead.position.set(-1.2 + Math.sin(u * 8 + i) * 0.35, 2.1, -7 + u * 14);
      });
    },
  };
}

export function sceneCache(materials, points) {
  const group = new THREE.Group();
  const levels = [
    { name: "L1", y: 3.2, w: 3.2, mat: materials.gold },
    { name: "L2", y: 1.1, w: 5.2, mat: materials.copper },
    { name: "L3", y: -1, w: 7.4, mat: materials.frame },
    { name: "SLC", y: -3.1, w: 9.6, mat: materials.silicon },
  ];
  for (const level of levels) group.add(box(level.w, 0.45, 2.4, level.mat, 0, level.y, 0));
  const trail = [];
  for (let i = 0; i < 8; i++) {
    const packet = new THREE.Mesh(new THREE.SphereGeometry(0.16 + i * 0.01, 16, 12), materials.accent.clone());
    packet.material.emissiveIntensity = 0.3 + i * 0.08;
    trail.push(packet);
    group.add(packet);
  }
  return {
    group,
    note: "The packet falls through L1, L2, L3, and SLC. Its pause uses the measured pointer-chase ns/load when that sweep has finished. The rises are not named L1.",
    update(dt, data) {
      const ns = data?.points?.[data.points.length - 1]?.nsPerLoad || 8;
      const speed = 1.2 / Math.max(1, ns / 8);
      const t = (group.userData.t = (group.userData.t || 0) + dt * speed);
      trail.forEach((packet, i) => {
        const u = ((t - i * 0.12) % 4) / 4;
        packet.position.y = 3.2 - u * 6.2;
        packet.position.x = Math.sin(t * 3 + i) * 0.35;
      });
    },
  };
}

export function sceneSram(materials) {
  const group = new THREE.Group();
  const cell = new THREE.Group();
  for (let i = 0; i < 6; i++)
    cell.add(box(0.35, 0.7, 0.25, i < 4 ? materials.silicon : materials.copper, (i - 2.5) * 0.55, 0, 0));
  cell.add(box(3.4, 0.08, 0.08, materials.gold, 0, 0.55, 0));
  cell.add(box(3.4, 0.08, 0.08, materials.gold, 0, -0.55, 0));
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(3.6, 1.6, 0.4), materials.frame, 16);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 16; i++) {
    dummy.position.set((i % 4) * 4 - 6, Math.floor(i / 4) * 2 - 3, -0.6);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  group.add(mesh, cell);
  return {
    group,
    note: "Textbook 6T SRAM: four logic transistors and two pass devices, plus bitlines. Cell height in tracks for N3P is not published. This is not a MediaTek bitcell.",
    update(dt) {
      cell.position.y = Math.sin(performance.now() * 0.004) * 0.15;
    },
  };
}

export function sceneFinfet(materials) {
  const specs = getSpecs();
  const pitch = specs.soc.process_n3e_cpp_nm.value;
  const group = new THREE.Group();
  const u = 0.09;
  const fins = new THREE.InstancedMesh(new THREE.CapsuleGeometry(pitch * u * 0.07, 5.5, 4, 8), materials.silicon, 6);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 6; i++) {
    dummy.position.set((i - 2.5) * pitch * u, 0, 0);
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  group.add(fins);
  group.add(box(pitch * u * 6.4, 0.9, 2.8, materials.copper, 0, 2.2, 0));
  group.add(box(1.2, 0.35, 2.2, materials.gold, 0, 2.8, 0));
  const gaa = new THREE.Group();
  for (let i = 0; i < 3; i++) gaa.add(box(4.2, 0.18, 1.1, materials.accent, 0, i * 0.45, 0));
  gaa.position.set(8, 0, 0);
  group.add(gaa);
  return {
    group,
    note: `N3P FinFET. Gate pitch ${pitch} nm is the cited N3E rule N3P keeps. Fin count and fin pitch are unpublished, so the six fins are a drawing. The sheets on the right are TSMC N2 GAA, a comparison, not this die.`,
    update() {},
  };
}

export function sceneBeol(materials) {
  const group = new THREE.Group();
  const pitches = [23, 28, 36, 48, 64, 80, 100, 130];
  pitches.forEach((pitch, i) => {
    const w = 1.2 + i * 0.55;
    group.add(box(w * 3.2, 0.12, w, i === 0 ? materials.gold : materials.copper, 0, i * 0.55, 0));
  });
  return {
    group,
    note: "Only the 23 nm minimum metal pitch is cited. The taller layers use wider pitches as a reconstruction of a typical BEOL, not a TSMC N3P deck. Dielectrics between the sheets are not a published stack.",
    update() {},
  };
}

export function sceneLitho(materials) {
  const image = aerialImage({ na: 0.33, pitchNm: 40, sigma: 0.5, n: 64, periods: 2 });
  const group = bars(Array.from(image.intensity), materials.accent, 3.2);
  return {
    group,
    note: `Live Abbe aerial image at NA 0.33, pitch 40 nm. Contrast ${image.contrast.toFixed(3)}. High-NA 0.55 is not claimed for N3P. Bar height is the computed intensity.`,
    update(dt) {
      group.rotation.y += dt * 0.2;
    },
  };
}

export function sceneWave(materials) {
  const n = 48;
  const values = [];
  for (let i = 0; i < n; i++) {
    const x = (i + 1) / (n + 1);
    values.push(Math.sin(2 * Math.PI * x) ** 2);
  }
  const group = bars(values, materials.silicon, 2.8);
  return {
    group,
    note: "Probability density of the n=2 infinite well, analytic sin². It is textbook confinement in a fin-scale well, not a 9500 device wavefunction.",
    update(dt) {
      group.rotation.y += dt * 0.25;
    },
  };
}

export function sceneTiler(materials) {
  const shaded = rasterizeTiles(
    [
      { x0: 2, y0: 2, x1: 26, y1: 4, x2: 6, y2: 24, r: 255, g: 122, b: 26 },
      { x0: 10, y0: 8, x1: 28, y1: 28, x2: 16, y2: 6, r: 80, g: 140, b: 220 },
    ],
    { width: 32, height: 32, tileSize: 8 },
  );
  const tiles = shaded.tilesX * shaded.tilesY;
  const geo = new THREE.BoxGeometry(0.9, 0.3, 0.9);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x223044,
    emissive: 0xff7a1a,
    emissiveIntensity: 0.2,
    roughness: 0.4,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, tiles);
  const dummy = new THREE.Object3D();
  const heights = [];
  for (let i = 0; i < tiles; i++) {
    const x = i % shaded.tilesX;
    const y = Math.floor(i / shaded.tilesX);
    const count = shaded.bins[i].length;
    heights.push(count);
    dummy.position.set(x - 1.5, count * 0.35, y - 1.5);
    dummy.scale.set(1, 0.4 + count, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    note: `Live binning. ${shaded.touched} tiles touched, ${shaded.shaded} pixels shaded. Tile height is the triangle count in that bin. This is not Mali’s tiler.`,
    update(dt) {
      mesh.material.emissiveIntensity = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
    },
  };
}

export function sceneGpuCore(materials) {
  const shaded = rasterizeTiles(
    [
      { x0: 2, y0: 2, x1: 30, y1: 6, x2: 8, y2: 28, r: 255, g: 122, b: 26 },
      { x0: 12, y0: 10, x1: 30, y1: 30, x2: 18, y2: 4, r: 90, g: 150, b: 230 },
    ],
    { width: 32, height: 32, tileSize: 8 },
  );
  const group = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    group.add(box(2.1, 5.2, 2.1, materials.silicon, col * 3.1 - 4.6, 2.6, row * 3.2 - 2));
  }
  const tiles = shaded.tilesX * shaded.tilesY;
  const tileMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xff7a1a,
    roughness: 0.35,
    metalness: 0.1,
  });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.7, 0.2), tileMat, tiles);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < tiles; i++) {
    const x = i % shaded.tilesX;
    const y = Math.floor(i / shaded.tilesX);
    const count = shaded.bins[i].length;
    dummy.position.set(x * 0.85 - 1.2, 0.8 + y * 0.85, 8.2);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.set(count ? 0xffb070 : 0x1c2838);
    mesh.setColorAt(i, color);
  }
  group.add(mesh);
  const packets = streak(materials, 10);
  packets.forEach((bead) => group.add(bead));
  const label = callout("Live tile bins");
  label.position.set(0, 4.6, 7.6);
  group.add(label);
  group.traverse((obj) => {
    obj.castShadow = false;
    obj.receiveShadow = false;
  });
  return {
    group,
    eye: EYE.gpu,
    note: `Inside the twelve shader cores, the cited MC12 count. The wall ahead is this lab’s binner: ${shaded.touched} bins touched, ${shaded.shaded} pixels shaded. Lit tiles received a triangle. This is not a Mali floorplan. GPU block area is 24.23 mm².`,
    update() {
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
      mesh.material.emissiveIntensity = pulse;
      const t = performance.now() * 0.001;
      packets.forEach((bead, i) => {
        const u = (t * 0.25 + i / packets.length) % 1;
        bead.position.set(-2 + (i % 3), 1.6 + (i % 4) * 0.4, -3 + u * 10);
      });
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
  const cells = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const mag = Math.abs(C[y * n + x]) / max;
      const h = 1.2 + mag * 8;
      const mesh = box(0.7, h, 0.7, materials.accent, x * 1.15 - n * 0.55, h / 2, y * 1.15 - n * 0.55);
      mesh.material = materials.accent.clone();
      mesh.userData.mag = mag;
      cells.push(mesh);
      group.add(mesh);
    }
  }
  const wall = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), materials.gold, 16 * 12);
  const dummy = new THREE.Object3D();
  let count = 0;
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 16; x++) {
      dummy.position.set(-8.5, 0.4 + y * 0.32, -2 + x * 0.32);
      dummy.updateMatrix();
      wall.setMatrixAt(count++, dummy.matrix);
    }
  }
  group.add(wall);
  for (let i = 0; i < (counts.mdla || 4); i++) {
    group.add(box(1.6, 6.5, 1.4, materials.silicon, -7.2, 3.2, -3 + i * 2));
  }
  const packets = streak(materials, 12);
  packets.forEach((bead) => group.add(bead));
  const label = callout("INT8 MAC");
  label.position.set(0, 6.4, 2);
  group.add(label);
  group.traverse((obj) => {
    obj.castShadow = false;
    obj.receiveShadow = false;
  });
  return {
    group,
    eye: EYE.npu,
    note: `${counts.mdla} MDLA and ${counts.mvpu} MVPU are cited. You are inside the MAC field. Column height and the sweeping glow are a live INT8 matmul in this page. It does not run on NPU 990. The SRAM wall is a drawing.`,
    update() {
      const sweep = (performance.now() * 0.0012) % n;
      cells.forEach((cell, i) => {
        const col = i % n;
        const near = 1 - Math.min(1, Math.abs(col - sweep) / 2.2);
        cell.material.emissiveIntensity = 0.15 + cell.userData.mag * (0.4 + near * 1.3);
      });
      const t = performance.now() * 0.001;
      packets.forEach((bead, i) => {
        const u = (t * 0.2 + i / packets.length) % 1;
        bead.position.set(-4 + u * 9, 2.4 + Math.sin(u * 6) * 0.4, -1 + (i % 5) * 0.5);
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
  cpu_l9_sme2: "pipeline",
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
