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

function asHole(shape) {
  const hole = new THREE.Path();
  const pts = shape.getPoints(32);
  for (let i = pts.length - 1; i >= 0; i--) {
    if (i === pts.length - 1) hole.moveTo(pts[i].x, pts[i].y);
    else hole.lineTo(pts[i].x, pts[i].y);
  }
  return hole;
}

/** Side wall only. No bevel, so the silhouette stays a clean rounded band. */
function frameBand(w, h, depth, radius, lip, material) {
  const outer = roundedRect(w, h, radius);
  outer.holes.push(asHole(roundedRect(w - lip * 2, h - lip * 2, Math.max(1.2, radius - lip))));
  const geo = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 28 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function slab(w, h, depth, radius, material) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, h, radius), {
    depth,
    bevelEnabled: true,
    bevelThickness: Math.min(0.28, depth * 0.12),
    bevelSize: Math.min(0.35, depth * 0.12),
    bevelSegments: 3,
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

function wordmark(text, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 640, 160);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "500 78px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 320, 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.y = Math.PI;
  return mesh;
}

function lens(materials, radius, x, y, z, flash = false) {
  const group = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, 1.5, 40), materials.frame);
  barrel.rotation.x = Math.PI / 2;
  const glassMat = flash
    ? new THREE.MeshStandardMaterial({
        color: 0xfff4d2,
        emissive: 0xffe1a8,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        side: THREE.DoubleSide,
      })
    : materials.lens.clone();
  glassMat.side = THREE.DoubleSide;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.78, 36), glassMat);
  glass.position.z = -0.82;
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(radius * (flash ? 0.28 : 0.36), 28),
    new THREE.MeshStandardMaterial({
      color: flash ? 0xfff8e8 : 0x061018,
      emissive: flash ? 0xfff1c2 : 0x3a6ea5,
      emissiveIntensity: flash ? 1 : 0.7,
      roughness: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  pupil.position.z = -0.9;
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

  const lip = 2.6;
  const body = frameBand(W, H, T, CORNER_MM, lip, materials.frame);
  group.add(body);

  const rear = slab(W - lip * 2 + 0.4, H - lip * 2 + 0.4, 0.45, CORNER_MM - lip, materials.rear);
  rear.position.z = -T / 2 + 0.42 - e * 18;
  group.add(rear);

  const glass = slab(W - 3.2, H - 3.2, 0.4, CORNER_MM - 1, materials.glass);
  glass.position.z = T / 2 + 0.08 + e * 26;
  group.add(glass);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 8, H - 14), materials.screen);
  screen.position.z = T / 2 + 1.4 + e * 12;
  group.add(screen);

  const plateau = new THREE.Group();
  plateau.position.set(-W * 0.18, H * 0.28, -T / 2 - 1.35 - e * 28);
  const island = slab(38, 38, 2.5, 9, materials.frame);
  plateau.add(island);
  const iz = -1.45;
  plateau.add(lens(materials, 6.4, -8, 8, iz));
  plateau.add(lens(materials, 6.1, 8, 8, iz));
  plateau.add(lens(materials, 5.8, -8, -8, iz));
  plateau.add(lens(materials, 2.3, 8.2, -8.2, iz, true));
  const pill = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 5.2, 8, 16), materials.gold);
  pill.position.set(24, 2, -0.2);
  plateau.add(pill);
  group.add(plateau);
  const leica = wordmark("LEICA", 28, 4.6);
  leica.position.set(-W * 0.18, H * 0.28 - 28, -T / 2 - 0.15 - e * 20);
  group.add(leica);
  const brand = wordmark("XIAOMI", 36, 5.2);
  brand.rotation.z = Math.PI / 2;
  brand.position.set(10, -6, -T / 2 - 0.12 - e * 14);
  group.add(brand);

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
      const plate = partLabel(cam.label);
      plate.rotation.y = Math.PI;
      plate.position.set(cam.dx - 8, H / 2 - cam.fromTop - 36, -T / 2 - 6 - e * 30);
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
  const tints = { cpu: 0xc4552a, gpu: 0x3d6ea8, npu: 0x7a5aaa };
  for (const block of plan.blocks) {
    const x = block.xMm + block.widthMm / 2 - die.widthMm / 2;
    const y = block.yMm + block.heightMm / 2 - die.heightMm / 2;
    const bodyMat = materials.silicon.clone();
    bodyMat.color.set(tints[block.id]);
    const body = box(block.widthMm * 0.96, block.heightMm * 0.9, 0.16, bodyMat, x, y, 0.12);
    body.name = block.id;
    group.add(body);
    group.add(box(block.widthMm * 0.9, block.heightMm * 0.82, 0.04, materials.dielectric, x, y, 0.22));
    group.add(
      box(block.widthMm * 0.72, block.heightMm * 0.08, 0.03, materials.copper, x, y + block.heightMm * 0.12, 0.26),
    );
    group.add(box(block.widthMm * 0.08, block.heightMm * 0.55, 0.03, materials.gold, x - block.widthMm * 0.2, y, 0.26));
  }
  return group;
}

/** One published block, opened. Metal lines sit on a dielectric over silicon. */
export function buildBlock(materials) {
  const plan = floorplan();
  const cpu = plan?.blocks.find((block) => block.id === "cpu");
  const group = new THREE.Group();
  group.name = "block";
  const w = 14;
  const h = 8;
  group.add(box(w, h, 1.2, materials.silicon, 0, 0, 0));
  group.add(box(w * 0.96, h * 0.94, 0.28, materials.dielectric, 0, 0, 0.74));
  for (let i = 0; i < 9; i++) {
    group.add(box(w * 0.9, 0.22, 0.12, materials.copper, 0, -h / 2 + 0.8 + i * 0.8, 0.94));
  }
  for (let i = 0; i < 6; i++) {
    group.add(box(0.16, h * 0.8, 0.1, materials.gold, -w / 2 + 1.2 + i * 2, 0, 1.02));
  }
  group.userData.area = cpu?.areaMm2;
  return group;
}

/** Textbook 6T drawing. Not a traced MediaTek bitcell. */
export function buildCell(materials) {
  const group = new THREE.Group();
  group.name = "cell";
  group.add(box(8, 0.2, 3.2, materials.silicon, 0, 0, 0));
  group.add(box(7.4, 0.08, 2.6, materials.dielectric, 0, 0.16, 0));
  for (let i = 0; i < 6; i++) {
    const x = -2.5 + i * 1;
    group.add(box(0.35, 0.9, 0.35, materials.silicon, x, 0.6, 0));
    group.add(box(0.5, 0.12, 0.7, materials.hik, x, 1.05, 0));
    group.add(box(0.22, 0.35, 0.22, materials.gold, x, 1.28, 0));
  }
  group.add(box(6.2, 0.08, 0.12, materials.copper, 0, 1.55, 0.5));
  group.add(box(6.2, 0.08, 0.12, materials.copper, 0, 1.55, -0.5));
  return group;
}

export function buildFinfet(materials) {
  const specs = getSpecs();
  const pitch = specs.soc.process_n3e_cpp_nm.value;
  const metal = specs.soc.process_n3e_min_metal_pitch_nm.value;
  const group = new THREE.Group();
  group.name = "finfet";
  const u = 0.08;
  const gap = pitch * u;
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * gap;
    const fin = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 4.8, 6, 10), materials.silicon);
    fin.position.set(x, 0.4, 0);
    group.add(fin);
    group.add(box(0.7, 0.55, 0.7, materials.gold, x, -1.6, 1.1));
    group.add(box(0.7, 0.55, 0.7, materials.gold, x, -1.6, -1.1));
    group.add(box(0.55, 1.5, 0.28, materials.hik, x, 1.15, 0));
    group.add(box(0.7, 1.7, 0.45, materials.frame, x, 1.35, 0));
  }
  for (let i = 0; i < 5; i++) {
    group.add(box(metal * u * 0.7, 0.12, 6.2, materials.copper, 0, 2.5 + i * (metal / pitch) * 0.9, 0));
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
