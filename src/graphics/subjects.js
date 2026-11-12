import * as THREE from "three";
import { boardPlacements, BOARD_MM, cameraModules } from "./board-layout.js";
import { floorplan, getSpecs, npuCounts, parseDieMm, parsePackageMm } from "../specs.js";

const CORNER_MM = 10;

function roundedRect(w, h, r) {
  const radius = Math.min(r, w / 2 - 0.2, h / 2 - 0.2);
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.absarc(x + w - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - radius);
  shape.absarc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + h);
  shape.absarc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, (Math.PI * 3) / 2, false);
  return shape;
}

function slab(w, h, depth, radius, material) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, h, radius), {
    depth,
    bevelEnabled: true,
    bevelThickness: Math.min(1.15, depth * 0.28),
    bevelSize: Math.min(1.2, depth * 0.28),
    bevelSegments: 5,
    curveSegments: 20,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function put(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

function box(w, h, d, material, x, y, z) {
  return put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, z);
}

function oledTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1560;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 720, 1560);
  sky.addColorStop(0, "#1b3a6b");
  sky.addColorStop(0.45, "#6a3a28");
  sky.addColorStop(1, "#1a120e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 720, 1560);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "600 28px sans-serif";
  ctx.fillText("9:41", 48, 84);
  ctx.font = "700 132px sans-serif";
  ctx.fillText("09:41", 48, 280);
  ctx.font = "500 36px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText("Thursday, 12 November", 48, 340);
  const icons = ["#ff7a1a", "#3d8bfd", "#34c759", "#ffd60a", "#bf5af2", "#64d2ff"];
  icons.forEach((color, i) => {
    const x = 56 + (i % 4) * 160;
    const y = 1120 + Math.floor(i / 4) * 160;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, 112, 112, 28);
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function pcbTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#143826";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = "rgba(210, 176, 96, 0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 47) % 1024, 0);
    ctx.lineTo((i * 80) % 1024, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i * 53) % 1024);
    ctx.lineTo(1024, (i * 29) % 1024);
    ctx.stroke();
  }
  ctx.fillStyle = "#e4c36a";
  for (let i = 0; i < 80; i++) ctx.fillRect((i * 97) % 1000, (i * 53) % 1000, 10, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function dieTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1a2433";
  ctx.fillRect(0, 0, 1024, 1024);
  const tones = ["#2c4c6e", "#245e62", "#4a3d68", "#5c4a30", "#234e58"];
  for (let y = 40; y < 980; y += 120) {
    for (let x = 40; x < 980; x += 150) {
      ctx.fillStyle = tones[(x + y) % tones.length];
      ctx.fillRect(x, y, 132, 100);
      ctx.strokeStyle = "rgba(190, 220, 255, 0.28)";
      ctx.lineWidth = 1;
      for (let sx = x + 8; sx < x + 132; sx += 6) {
        ctx.beginPath();
        ctx.moveTo(sx, y + 6);
        ctx.lineTo(sx, y + 94);
        ctx.stroke();
      }
    }
  }
  ctx.strokeStyle = "rgba(232, 186, 96, 0.7)";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, 988, 988);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lens(materials, radius, x, y, z) {
  const group = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, 1.4, 32), materials.frame);
  barrel.rotation.x = Math.PI / 2;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.78, 32), materials.lens);
  glass.position.z = 0.72;
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.34, 24),
    new THREE.MeshStandardMaterial({ color: 0x071018, emissive: 0x1a4a7a, emissiveIntensity: 0.45, roughness: 0.2 }),
  );
  pupil.position.z = 0.78;
  group.add(barrel, glass, pupil);
  group.position.set(x, y, z);
  return group;
}

/** Cited body. Corner radius is a reconstruction; Xiaomi does not publish it. */
export function buildPhone(materials, explode = 0) {
  const specs = getSpecs();
  const W = specs.device.width_mm.value;
  const H = specs.device.height_mm.value;
  const T = specs.device.thickness_mm.value;
  const e = explode;
  const group = new THREE.Group();
  group.name = "phone";

  const body = slab(W, H, T, CORNER_MM, materials.frame);
  group.add(body);

  const rear = slab(W - 2.2, H - 2.2, 0.45, CORNER_MM - 0.5, materials.rear);
  rear.position.z = -T / 2 - 0.05 - e * 16;
  group.add(rear);

  const glass = slab(W - 3.2, H - 3.2, 0.4, CORNER_MM - 1, materials.glass);
  glass.position.z = T / 2 + 0.08 + e * 26;
  group.add(glass);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 8, H - 14), materials.screen);
  screen.position.z = T / 2 + 1.4 + e * 12;
  group.add(screen);

  const island = slab(34, 42, 2.6, 8, materials.frame);
  island.position.set(-W * 0.15, H * 0.27, -T / 2 - 1.6 - e * 28);
  group.add(island);
  const iz = island.position.z - 1.4;
  group.add(lens(materials, 6.1, -W * 0.15 - 7, H * 0.27 + 8, iz));
  group.add(lens(materials, 4.6, -W * 0.15 + 8, H * 0.27 + 8, iz));
  group.add(lens(materials, 3.8, -W * 0.15 + 0.5, H * 0.27 - 9, iz));

  const power = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 15, 6, 12), materials.frame);
  power.position.set(W / 2 + 0.2, 24, 0);
  group.add(power);
  const volume = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 10, 6, 12), materials.frame);
  volume.position.set(W / 2 + 0.2, -4, 0);
  group.add(volume);
  const port = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 8, 6, 16), materials.lens);
  port.rotation.z = Math.PI / 2;
  port.position.set(0, -H / 2 + 0.2, 0);
  group.add(port);

  if (e > 0.02) {
    const board = buildBoard(materials);
    board.scale.setScalar(0.72);
    board.position.set(0, 8, e * 46);
    group.add(board);
    for (const cam of cameraModules()) {
      const y = H / 2 - cam.fromTop;
      group.add(box(cam.w, cam.h, cam.d, materials.frame, cam.dx, y, -T / 2 - 4 - e * 20));
      const plate = partLabel(cam.label);
      plate.position.set(cam.dx, y, -T / 2 - 8 - e * 20);
      group.add(plate);
    }
    const cells = (W - 16) / 2;
    group.add(box(cells - 1, H * 0.42, 3.1, materials.battery, -cells / 2, -H * 0.16, e * 34));
    group.add(box(cells - 1, H * 0.42, 3.1, materials.battery, cells / 2, -H * 0.16, e * 34));
    group.add(box(W - 14, H * 0.55, 0.45, materials.copper, 0, 4, e * 40));
  }
  return group;
}

function partLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(12, 11, 10, 0.86)";
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = "#f4efe8";
  ctx.font = "600 40px sans-serif";
  ctx.fillText(text, 16, 62);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(6, text.length * 0.72), 1.5),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
  );
  plate.name = `label-${text}`;
  return plate;
}

export function buildBoard(materials) {
  const group = new THREE.Group();
  group.name = "board";
  const board = box(BOARD_MM.width, BOARD_MM.height, 0.9, materials.pcb, 0, 0, 0);
  board.name = "compeq";
  group.add(board);
  const silk = partLabel("COMPEQ  1-P20-EV");
  silk.position.set(0, -BOARD_MM.height / 2 + 3.2, 0.55);
  group.add(silk);
  for (const part of boardPlacements()) {
    const mesh = box(
      part.w,
      part.h,
      part.d,
      materials[part.tone] || materials.silicon,
      part.x,
      part.y,
      0.45 + part.d / 2,
    );
    mesh.name = part.id;
    group.add(mesh);
    const plate = partLabel(part.label);
    plate.position.set(part.x, part.y + part.h / 2 + 1.1, 1.6 + part.d);
    group.add(plate);
  }
  return group;
}

export function buildPackage(materials) {
  const pkg = parsePackageMm();
  const group = new THREE.Group();
  group.name = "package";
  if (!pkg) return group;
  const w = pkg.widthMm;
  const h = pkg.heightMm;
  const thick = pkg.thickMm || 0.455;
  group.add(box(w, h, thick, materials.substrate, 0, 0, 0));
  const pitch = 0.35;
  const ball = new THREE.SphereGeometry(0.11, 8, 6);
  const cols = Math.floor((w - 0.8) / pitch);
  const rows = Math.floor((h - 0.8) / pitch);
  const mesh = new THREE.InstancedMesh(ball, materials.gold, cols * rows);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      dummy.position.set(-w / 2 + 0.5 + i * pitch, -h / 2 + 0.5 + j * pitch, -thick / 2 - 0.1);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
  }
  mesh.count = n;
  group.add(mesh);
  group.add(box(w * 0.72, h * 0.72, 0.28, materials.silicon, 0, 0, thick / 2 + 0.2));
  group.add(box(w * 0.6, h * 0.6, 0.22, materials.accent, 0, 0, thick / 2 + 0.5));
  return group;
}

export function buildDie(materials) {
  const plan = floorplan();
  const die = parseDieMm();
  const group = new THREE.Group();
  group.name = "die";
  if (!plan || !die) return group;
  const slabMesh = box(die.widthMm, die.heightMm, 0.2, materials.die, 0, 0, 0);
  group.add(slabMesh);
  const colors = { cpu: 0xc4552a, gpu: 0x3d6ea8, npu: 0x7a5aaa };
  for (const block of plan.blocks) {
    const mesh = box(
      block.widthMm * 0.96,
      block.heightMm * 0.9,
      0.12,
      new THREE.MeshStandardMaterial({
        color: colors[block.id],
        roughness: 0.42,
        metalness: 0.35,
        map: materials.die.map,
      }),
      block.xMm + block.widthMm / 2 - die.widthMm / 2,
      block.yMm + block.heightMm / 2 - die.heightMm / 2,
      0.16,
    );
    mesh.name = block.id;
    group.add(mesh);
  }
  return group;
}

export function buildFinfet(materials) {
  const specs = getSpecs();
  const pitch = specs.soc.process_n3e_cpp_nm.value;
  const metal = specs.soc.process_n3e_min_metal_pitch_nm.value;
  const group = new THREE.Group();
  group.name = "finfet";
  const u = 0.08;
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.CapsuleGeometry(pitch * u * 0.08, 6, 4, 8), materials.silicon);
    fin.position.set((i - 3) * pitch * u, 0, 0);
    group.add(fin);
  }
  group.add(box(pitch * u * 7.2, 1.2, 3.4, materials.copper, 0, 2.4, 0));
  group.add(box(1.4, 1.6, 2.2, materials.gold, -pitch * u * 3.2, -1.2, 0));
  group.add(box(1.4, 1.6, 2.2, materials.gold, pitch * u * 3.2, -1.2, 0));
  for (let i = 0; i < 6; i++) {
    group.add(box(metal * u * 0.45, 0.2, 8, materials.accent, 0, 3.3, (i - 2.5) * metal * u));
  }
  return group;
}

export function buildLattice(materials) {
  const group = new THREE.Group();
  group.name = "lattice";
  const a = 3.2;
  const basis = [
    [0, 0, 0],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
    [0.25, 0.25, 0.25],
    [0.75, 0.75, 0.25],
    [0.75, 0.25, 0.75],
    [0.25, 0.75, 0.75],
  ];
  const atoms = [];
  const geo = new THREE.SphereGeometry(0.38, 20, 16);
  for (let ix = 0; ix < 2; ix++) {
    for (let iy = 0; iy < 2; iy++) {
      for (let iz = 0; iz < 2; iz++) {
        for (const [bx, by, bz] of basis) {
          const p = new THREE.Vector3((ix + bx) * a, (iy + by) * a, (iz + bz) * a);
          atoms.push(p);
          group.add(put(new THREE.Mesh(geo, materials.accent), p.x, p.y, p.z));
        }
      }
    }
  }
  const bond = (a * Math.sqrt(3)) / 4;
  const seen = new Set();
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const d = atoms[i].distanceTo(atoms[j]);
      if (Math.abs(d - bond) > 0.25) continue;
      const key = `${i}:${j}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const mid = atoms[i].clone().add(atoms[j]).multiplyScalar(0.5);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, d, 6), materials.copper);
      cyl.position.copy(mid);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), atoms[j].clone().sub(atoms[i]).normalize());
      group.add(cyl);
    }
  }
  const center = new THREE.Vector3(a, a, a);
  group.position.copy(center.multiplyScalar(-1));
  return group;
}

export function buildMac(materials, cells = 8) {
  const counts = npuCounts();
  const group = new THREE.Group();
  group.name = "mac";
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const mesh = box(0.7, 0.7, 0.35, materials.silicon, x - cells / 2, y - cells / 2, 0);
      mesh.name = `mac-${x}-${y}`;
      group.add(mesh);
    }
  }
  for (let i = 0; i < (counts.mdla || 4); i++) {
    group.add(box(1.5, 0.4, 0.3, materials.accent, -cells / 2 - 1.5, i * 1.1 - 1.6, 0));
  }
  return group;
}

export function buildTilerMesh(materials, image) {
  const group = new THREE.Group();
  const tex = new THREE.DataTexture(image.data, image.width, image.height);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  group.add(
    new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })),
  );
  group.name = "tiler";
  return group;
}

export function buildBars(materials, points) {
  const group = new THREE.Group();
  const max = Math.max(...points.map((point) => point.nsPerLoad || 0), 1);
  points.forEach((point, i) => {
    const h = 0.4 + 6 * ((point.nsPerLoad || 0) / max);
    group.add(box(0.7, h, 0.7, materials.accent, i * 1.1, h / 2, 0));
  });
  group.name = "cache";
  return group;
}

export { oledTexture, pcbTexture, dieTexture };
