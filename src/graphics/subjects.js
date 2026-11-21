import * as THREE from "three";
import { boardPlacements, BOARD_MM, cameraModules } from "./board-layout.js";
import { floorplan, getSpecs, npuCounts, parseDieMm, parsePackageMm } from "../specs.js";

const CORNER_MM = 10.5;

export const PHONE_FINISHES = {
  "Deep Violet": { rear: 0x5c3c72, frame: 0xbcb6c8, deco: 0x1a1624 },
  Black: { rear: 0x171b22, frame: 0x454d5a, deco: 0x0e1116 },
  "Deep Blue": { rear: 0x193152, frame: 0x8ea3bd, deco: 0x101c2d },
};

export function setPhoneFinish(materials, name) {
  const f = PHONE_FINISHES[name] || PHONE_FINISHES["Deep Violet"];
  materials.rear.color.setHex(f.rear);
  materials.frame.color.setHex(f.frame);
  if (materials.deco) materials.deco.color.setHex(f.deco);
}

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
    bevelThickness: Math.min(0.32, depth * 0.14),
    bevelSize: Math.min(0.38, depth * 0.14),
    bevelSegments: 4,
    curveSegments: 24,
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
  const m = put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Live HyperOS 3 hardware-telemetry AMOLED screen texture (no fake iOS crayons). */
function oledTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1560;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 720, 1560);
  bg.addColorStop(0, "#091020");
  bg.addColorStop(0.38, "#16243d");
  bg.addColorStop(0.72, "#1c1428");
  bg.addColorStop(1, "#080b12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 720, 1560);

  // Subtle Xiaomi signature energy ribbon glow
  const orb1 = ctx.createRadialGradient(540, 480, 20, 540, 480, 380);
  orb1.addColorStop(0, "rgba(255, 105, 0, 0.42)");
  orb1.addColorStop(0.55, "rgba(167, 139, 250, 0.16)");
  orb1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, 720, 1560);

  const orb2 = ctx.createRadialGradient(160, 1020, 20, 160, 1020, 360);
  orb2.addColorStop(0, "rgba(56, 212, 242, 0.34)");
  orb2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, 720, 1560);

  // Punch-hole camera & HyperOS 3 status bar
  ctx.fillStyle = "#04060a";
  ctx.beginPath();
  ctx.arc(360, 54, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(238, 243, 250, 0.9)";
  ctx.font = "600 26px sans-serif";
  ctx.fillText("5G · Wi-Fi 7", 44, 62);
  ctx.textAlign = "right";
  ctx.fillText("144Hz  100%", 676, 62);
  ctx.textAlign = "left";

  // Hero device title
  ctx.fillStyle = "#38d4f2";
  ctx.font = "700 24px monospace";
  ctx.fillText("HYPEROS 3 · WARHOL (MT6993Z)", 48, 178);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 108px sans-serif";
  ctx.fillText("17T Pro", 44, 290);
  ctx.fillStyle = "rgba(220, 232, 250, 0.78)";
  ctx.font = "500 30px monospace";
  ctx.fillText("Dimensity 9500 · TSMC N3P FinFET", 48, 344);

  // Live silicon telemetry glass cards on the OLED
  const cards = [
    ["ARM C1 CLUSTER", "4.21 / 3.50 / 2.70 GHz", "16 MB L3 · 10 MB SLC · SME2 512b", "#ff7a1a"],
    ["MALI-G1 ULTRA MC12", "5.27 TFLOPS FP32*", "12 Cores · RTUv2 · 2 MiB L2", "#38d4f2"],
    ["NPU 990 + CIM", "4× MDLA + 2× MVPU", "BitNet 1.58b · 128K Ctx · 28 tok/s", "#a78bfa"],
    ["LPDDR5X + UFS 4.1", "76.8 GB/s · 3.02 GB/s", "SK hynix H58GG6AV9H + HN8T271EJK", "#4ade80"],
    ["3D ICELOOP + 7000 mAh", "5500 mm² · 16% Si-C", 'TCL CSOT 6.83" · 3500 nits · 447 PPI', "#fbbf24"],
  ];
  cards.forEach(([title, val, sub, color], i) => {
    const y = 420 + i * 188;
    ctx.fillStyle = "rgba(10, 14, 24, 0.72)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(44, y, 632, 162, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(44, y + 26, 6, 110);
    ctx.font = "700 22px monospace";
    ctx.fillText(title, 74, y + 48);
    ctx.fillStyle = "#f4f7fc";
    ctx.font = "700 38px monospace";
    ctx.fillText(val, 74, y + 100);
    ctx.fillStyle = "rgba(180, 196, 220, 0.85)";
    ctx.font = "500 22px monospace";
    ctx.fillText(sub, 74, y + 138);
  });

  // Bottom waveform bar
  ctx.strokeStyle = "#38d4f2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 56; x <= 664; x += 6) {
    const u = (x - 56) / 608;
    const wy = 1445 + Math.sin(u * Math.PI * 10) * Math.sin(u * Math.PI) * 34;
    if (x === 56) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** High-density multilayer Compeq PCB solder-mask & copper-bus texture. */
function pcbTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b241d";
  ctx.fillRect(0, 0, 1024, 1024);

  // Fine impedance-controlled differential microstrip buses
  ctx.strokeStyle = "rgba(46, 178, 128, 0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 64; i++) {
    const x = i * 16;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 420 + (i % 5) * 40);
    ctx.lineTo(x + 90, 510 + (i % 5) * 40);
    ctx.lineTo(x + 90, 1024);
    ctx.stroke();
  }
  // Gold ENIG pads & blind microvias
  ctx.fillStyle = "#d9b452";
  for (let i = 0; i < 160; i++) {
    const vx = (i * 131 + 29) % 990;
    const vy = (i * 227 + 47) % 990;
    ctx.beginPath();
    ctx.arc(vx, vy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(232, 194, 96, 0.42)";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 984, 984);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Iridescent photolithographic silicon die macro-grid texture. */
function dieTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 1024, 1024);
  bg.addColorStop(0, "#101e33");
  bg.addColorStop(0.5, "#192d4a");
  bg.addColorStop(1, "#122035");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 1024);

  // Standard-cell macro rows + SRAM subarrays
  const palettes = ["#1e4066", "#1a4d5c", "#352e60", "#4f3728", "#1f4752"];
  for (let y = 32; y < 990; y += 64) {
    for (let x = 32; x < 990; x += 80) {
      ctx.fillStyle = palettes[((x >> 4) + (y >> 4)) % palettes.length];
      ctx.fillRect(x, y, 72, 54);
      ctx.strokeStyle = "rgba(110, 210, 255, 0.22)";
      ctx.lineWidth = 1;
      for (let sx = x + 5; sx < x + 70; sx += 5) {
        ctx.beginPath();
        ctx.moveTo(sx, y + 4);
        ctx.lineTo(sx, y + 50);
        ctx.stroke();
      }
    }
  }
  // Perimeter I/O bond-pad ring
  ctx.strokeStyle = "rgba(240, 201, 96, 0.85)";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 996, 996);
  ctx.fillStyle = "#f0c960";
  for (let p = 24; p < 1000; p += 16) {
    ctx.fillRect(p, 4, 8, 8);
    ctx.fillRect(p, 1012, 8, 8);
    ctx.fillRect(4, p, 8, 8);
    ctx.fillRect(1012, p, 8, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function wordmark(text, w, h, color = "rgba(235, 242, 252, 0.82)") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 768, 160);
  ctx.fillStyle = color;
  ctx.font = "600 68px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 384, 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.y = Math.PI;
  return mesh;
}

/** Precision Leica Summilux multi-element optical lens barrel. */
function lens(materials, radius, x, y, z, kind = "round") {
  const group = new THREE.Group();
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.11, 16, 48),
    kind === "flash" ? materials.gold : materials.frame,
  );
  outerRing.position.z = -0.65;

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.98, radius * 1.02, 1.9, 44),
    materials.deco || materials.frame,
  );
  barrel.rotation.x = Math.PI / 2;

  const recessed = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius * 0.72, 1.2, 36),
    new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.35, metalness: 0.4 }),
  );
  recessed.rotation.x = Math.PI / 2;
  recessed.position.z = -0.5;

  if (kind === "flash") {
    const diffuser = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.8, 32),
      new THREE.MeshStandardMaterial({
        color: 0xfff4d6,
        emissive: 0xffd996,
        emissiveIntensity: 1.15,
        roughness: 0.2,
        side: THREE.DoubleSide,
      }),
    );
    diffuser.position.z = -0.98;
    group.add(barrel, outerRing, diffuser);
  } else {
    const glassMat = materials.lens.clone();
    glassMat.side = THREE.DoubleSide;
    const dome = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.82, 40), glassMat);
    dome.position.z = -0.96;

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.56, radius * 0.04, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0x1a2840, metalness: 0.85, roughness: 0.25 }),
    );
    innerRing.position.z = -1.0;

    let pupil;
    if (kind === "periscope") {
      // Rectangular 5x folded-optic periscope prism opening (JN5 telephoto)
      pupil = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 0.84, radius * 0.62),
        new THREE.MeshStandardMaterial({
          color: 0x05101f,
          emissive: 0x2684cc,
          emissiveIntensity: 0.9,
          roughness: 0.1,
          side: THREE.DoubleSide,
        }),
      );
    } else {
      pupil = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.34, 28),
        new THREE.MeshStandardMaterial({
          color: 0x040b18,
          emissive: 0x38a8f2,
          emissiveIntensity: 0.8,
          roughness: 0.12,
          side: THREE.DoubleSide,
        }),
      );
    }
    pupil.position.z = -1.04;
    group.add(barrel, outerRing, recessed, dome, innerRing, pupil);
  }

  group.position.set(x, y, z);
  return group;
}

/** Cited 162.2 x 77.5 x 8.25 mm Xiaomi 17T Pro + 7-layer exploded teardown. */
export function buildPhone(materials, explode = 0) {
  const specs = getSpecs();
  const W = specs.device.width_mm.value;
  const H = specs.device.height_mm.value;
  const T = specs.device.thickness_mm.value;
  const e = explode;
  const group = new THREE.Group();
  group.name = "phone";

  // 1. Sand-blasted aluminum alloy chassis frame
  const body = slab(W, H, T, CORNER_MM, materials.frame);
  group.add(body);

  // Subtle metallic antenna breaks along side rails
  const antMat = new THREE.MeshStandardMaterial({ color: 0x222938, roughness: 0.65, metalness: 0.2 });
  for (const ay of [-H * 0.36, H * 0.36]) {
    group.add(box(W + 0.55, 1.3, T * 0.55, antMat, 0, ay, 0));
  }

  // 2. AG Matte Rear Glass Cover
  const rear = slab(W - 1.5, H - 1.5, 0.65, CORNER_MM - 0.5, materials.rear);
  rear.position.z = -T / 2 - 0.42 - e * 22;
  group.add(rear);

  // 3. Front Display Stack: bezel + live HyperOS 3 AMOLED + Gorilla Glass 7i
  const bezel = slab(W - 2.2, H - 2.2, 0.4, CORNER_MM - 0.8, materials.deco || materials.substrate);
  bezel.position.z = T / 2 + 0.18 + e * 20;
  group.add(bezel);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 5.6, H - 7.8), materials.screen);
  screen.position.z = T / 2 + 0.52 + e * 22;
  group.add(screen);

  const glass = slab(W - 2.6, H - 2.6, 0.35, CORNER_MM - 0.9, materials.glass);
  glass.position.z = T / 2 + 0.72 + e * 32;
  group.add(glass);

  // 4. Leica Summilux Triple Camera Deco Island
  const plateau = new THREE.Group();
  plateau.position.set(-W * 0.17, H * 0.27, -T / 2 - 1.4 - e * 30);
  const islandOuter = slab(40.5, 40.5, 2.2, 10.5, materials.frame);
  const islandInner = slab(38.2, 38.2, 2.7, 9.6, materials.deco || materials.substrate);
  islandInner.position.z = -0.25;
  plateau.add(islandOuter, islandInner);

  const iz = -1.65;
  plateau.add(lens(materials, 6.8, -8.8, 8.6, iz, "round")); // OVX9500 50MP main
  plateau.add(lens(materials, 6.4, 8.8, 8.6, iz, "periscope")); // JN5 50MP 5x telephoto
  plateau.add(lens(materials, 5.8, -8.8, -8.6, iz, "round")); // OV13B 12MP ultrawide
  plateau.add(lens(materials, 2.4, 8.8, -8.6, iz, "flash")); // Dual-tone LED flash

  const leicaIsland = wordmark("LEICA", 11.5, 2.1, "rgba(255, 255, 255, 0.9)");
  leicaIsland.position.set(0, 0, -1.85);
  plateau.add(leicaIsland);
  group.add(plateau);

  const brand = wordmark("XIAOMI", 22, 3.0, "rgba(230, 238, 250, 0.72)");
  brand.rotation.z = Math.PI / 2;
  brand.position.set(W * 0.3, -H * 0.25, -T / 2 - 0.95 - e * 22);
  group.add(brand);

  // Hardware buttons & USB-C 2.0 port
  const power = new THREE.Mesh(new THREE.CapsuleGeometry(0.68, 12, 6, 12), materials.frame);
  power.position.set(W / 2 + 0.35, 18, 0);
  group.add(power);
  const volume = new THREE.Mesh(new THREE.CapsuleGeometry(0.68, 22, 6, 12), materials.frame);
  volume.position.set(W / 2 + 0.35, 42, 0);
  group.add(volume);
  const port = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 7.6, 6, 16), materials.deco || materials.substrate);
  port.rotation.z = Math.PI / 2;
  port.position.set(0, -H / 2 + 0.1, 0);
  group.add(port);

  // 5-7. Exploded Internal Teardown (ERP repair manual + FCC 2AFZZPTC0G parts)
  if (e > 0.02) {
    // 3D IceLoop Copper Vapor Chamber (5500 mm^2 total dissipation stack)
    const vcGroup = new THREE.Group();
    vcGroup.position.set(0, 4, e * 10);
    vcGroup.add(slab(W - 14, H * 0.54, 0.45, 5, materials.copper));
    // Etched copper heat-pipe manifold rails
    for (let i = -2; i <= 2; i++) {
      vcGroup.add(box(1.4, H * 0.48, 0.22, materials.gold, i * 10.5, 0, 0.26));
    }
    const vcTag = partLabel("3D IceLoop VC (5500 mm²)");
    vcTag.position.set(0, H * 0.3, 1.2);
    vcGroup.add(vcTag);
    group.add(vcGroup);

    // Compeq 1-P20-EV Mainboard with 15 FCC-verified chips
    const board = buildBoard(materials);
    board.scale.setScalar(0.84);
    board.position.set(0, 14, -e * 4);
    group.add(board);

    // Dual-cell 7000 mAh 16% Silicon-Carbon Battery + Wireless Charging Coil
    const cells = (W - 16) / 2;
    const batGroup = new THREE.Group();
    batGroup.position.set(0, -H * 0.18, -e * 12);
    batGroup.add(box(cells - 1.2, H * 0.42, 3.2, materials.battery, -cells / 2, 0, 0));
    batGroup.add(box(cells - 1.2, H * 0.42, 3.2, materials.battery, cells / 2, 0, 0));
    // 50W Qi / NU1671 copper charging coil
    const coil = new THREE.Mesh(new THREE.TorusGeometry(19, 1.4, 10, 48), materials.copper);
    coil.position.set(0, 4, -2.0);
    batGroup.add(coil);
    const batTag = partLabel("7000 mAh Dual-Cell 16% Si-C");
    batTag.rotation.y = Math.PI;
    batTag.position.set(0, -18, -2.6);
    batGroup.add(batTag);
    group.add(batGroup);

    // Triple Optical Sensor Modules
    for (const cam of cameraModules()) {
      const mod = box(
        11,
        11,
        5.2,
        materials.deco || materials.silicon,
        cam.dx - 12,
        H / 2 - cam.fromTop - 26,
        -T / 2 - 4 - e * 18,
      );
      group.add(mod);
      const plate = partLabel(cam.label);
      plate.rotation.y = Math.PI;
      plate.position.set(cam.dx - 12, H / 2 - cam.fromTop - 34, -T / 2 - 7 - e * 18);
      group.add(plate);
    }
  }
  return group;
}

function partLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 84;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(8, 12, 20, 0.9)";
  ctx.strokeStyle = "rgba(56, 212, 242, 0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 76, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#eef4ff";
  ctx.font = "600 34px monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, 44);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(8, text.length * 0.66), 1.45),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, side: THREE.DoubleSide }),
  );
  plate.name = `label-${text}`;
  return plate;
}

export function buildBoard(materials) {
  const group = new THREE.Group();
  group.name = "board";
  const board = box(BOARD_MM.width, BOARD_MM.height, 1.0, materials.pcb, 0, 0, 0);
  board.name = "compeq";
  group.add(board);

  // Subtle EMI shield perimeter rails
  const railMat = materials.frame;
  group.add(box(BOARD_MM.width - 2, 0.5, 0.4, railMat, 0, BOARD_MM.height / 2 - 1, 0.7));
  group.add(box(BOARD_MM.width - 2, 0.5, 0.4, railMat, 0, -BOARD_MM.height / 2 + 1, 0.7));

  const silk = partLabel("COMPEQ  1-P20-EV (FCC 2AFZZPTC0G)");
  silk.position.set(0, -BOARD_MM.height / 2 + 3.4, 0.85);
  group.add(silk);

  for (const part of boardPlacements()) {
    const mat = materials[part.tone] || materials.silicon;
    const mesh = box(part.w, part.h, part.d, mat, part.x, part.y, 0.5 + part.d / 2);
    mesh.name = part.id;
    group.add(mesh);

    // Metallic bevel cap on major packages
    if (part.w >= 6) {
      group.add(box(part.w * 0.88, part.h * 0.88, 0.08, materials.gold, part.x, part.y, 0.5 + part.d + 0.05));
    }
    const plate = partLabel(part.label);
    plate.scale.setScalar(0.68);
    plate.position.set(part.x, part.y + part.h / 2 + 1.2, 1.4 + part.d);
    group.add(plate);
  }
  return group;
}

export function buildPackage(materials) {
  const pkg = parsePackageMm();
  const die = parseDieMm();
  const group = new THREE.Group();
  group.name = "package";
  if (!pkg) return group;
  const w = pkg.widthMm;
  const h = pkg.heightMm;
  const thick = pkg.thickMm || 0.455;

  // ABF multilayer organic substrate
  group.add(box(w, h, Math.max(thick, 0.42), materials.pcb, 0, 0, 0));

  // Instanced 0.35 mm pitch C4 BGA solder balls underneath
  const pitch = 0.55;
  const ball = new THREE.SphereGeometry(0.14, 10, 8);
  const cols = Math.floor((w - 1.0) / pitch);
  const rows = Math.floor((h - 1.0) / pitch);
  const mesh = new THREE.InstancedMesh(ball, materials.gold, cols * rows);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      dummy.position.set(-w / 2 + 0.6 + i * pitch, -h / 2 + 0.6 + j * pitch, -Math.max(thick, 0.42) / 2 - 0.14);
      dummy.updateMatrix();
      mesh.setMatrixAt(n++, dummy.matrix);
    }
  }
  mesh.count = n;
  group.add(mesh);

  // Thinned 200 um Dimensity 9500 silicon die (10.88 x 12.92 mm)
  const dw = die ? die.widthMm : w * 0.72;
  const dh = die ? die.heightMm : h * 0.78;
  group.add(box(dw, dh, 0.32, materials.die, 0, 0, 0.45));

  // Perimeter PoP interposer solder balls supporting top DRAM
  const popBalls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), materials.copper, 48);
  let pb = 0;
  for (let i = 0; i < 12; i++) {
    const u = -0.45 + (i / 11) * 0.9;
    for (const [bx, by] of [
      [u * (w - 1.4), (h - 1.2) / 2],
      [u * (w - 1.4), -(h - 1.2) / 2],
      [(w - 1.2) / 2, u * (h - 1.4)],
      [-(w - 1.2) / 2, u * (h - 1.4)],
    ]) {
      if (pb >= 48) break;
      dummy.position.set(bx, by, 0.9);
      dummy.updateMatrix();
      popBalls.setMatrixAt(pb++, dummy.matrix);
    }
  }
  popBalls.count = pb;
  group.add(popBalls);

  // Top stacked SK hynix H58GG6AV9H 12 GB LPDDR5X-9600 PoP package (elevated slightly to show die inside!)
  const dramTop = box(w * 0.94, h * 0.94, 0.55, materials.deco || materials.substrate, 0, 0, 2.35);
  group.add(dramTop);
  const dramLabel = partLabel("SK hynix H58GG6AV9H · 12GB LPDDR5X-9600");
  dramLabel.scale.setScalar(0.55);
  dramLabel.position.set(0, 0, 2.75);
  group.add(dramLabel);

  const socLabel = partLabel("MT6993Z Dimensity 9500 (140.57 mm²)");
  socLabel.scale.setScalar(0.5);
  socLabel.position.set(0, -h * 0.5 - 1.6, 0.45);
  group.add(socLabel);

  return group;
}

export function buildDie(materials) {
  const plan = floorplan();
  const die = parseDieMm();
  const group = new THREE.Group();
  group.name = "die";
  if (!plan || !die) return group;

  // Silicon substrate wafer slab
  const slabMesh = box(die.widthMm, die.heightMm, 0.3, materials.die, 0, 0, 0);
  group.add(slabMesh);

  // Raised Kurnal-area macro blocks with glowing micro-edges
  const blockDefs = {
    cpu: { color: 0xff6900, label: "CPU 28.75 mm² (1+3+4 C1)" },
    gpu: { color: 0x38d4f2, label: "Mali-G1 Ultra MC12 · 24.23 mm²" },
    npu: { color: 0xa78bfa, label: "NPU 990 (4 MDLA + 2 MVPU) · 12.60 mm²" },
  };
  for (const block of plan.blocks) {
    const info = blockDefs[block.id] || { color: 0x4ade80, label: block.id };
    const cx = block.xMm + block.widthMm / 2 - die.widthMm / 2;
    const cy = block.yMm + block.heightMm / 2 - die.heightMm / 2;
    const mesh = box(
      block.widthMm * 0.95,
      block.heightMm * 0.88,
      0.28,
      new THREE.MeshPhysicalMaterial({
        color: info.color,
        emissive: info.color,
        emissiveIntensity: 0.16,
        roughness: 0.25,
        metalness: 0.55,
        map: materials.die.map,
      }),
      cx,
      cy,
      0.3,
    );
    mesh.name = block.id;
    group.add(mesh);

    const tag = partLabel(info.label);
    tag.scale.setScalar(0.36);
    tag.position.set(cx, cy, 0.62);
    group.add(tag);
  }

  // Perimeter LPDDR5X & UFS PHY strips + copper power-delivery mesh
  for (const sy of [-die.heightMm * 0.46, die.heightMm * 0.46]) {
    group.add(box(die.widthMm * 0.86, 0.48, 0.18, materials.gold, 0, sy, 0.22));
  }
  for (let i = -3; i <= 3; i++) {
    group.add(box(die.widthMm * 0.94, 0.05, 0.05, materials.copper, 0, i * (die.heightMm / 8), 0.48));
  }
  return group;
}

/** Sculpted TSMC N3P FinFET (48 nm CPP, 23 nm M0) vs TSMC N2 GAA Nanosheet contrast. */
export function buildFinfet(materials) {
  const specs = getSpecs();
  const pitch = specs.soc.process_n3e_cpp_nm.value;
  const metal = specs.soc.process_n3e_min_metal_pitch_nm.value;
  const group = new THREE.Group();
  group.name = "finfet";
  const u = 0.075;
  const span = pitch * u * 6;

  // Bulk crystalline silicon substrate + STI dielectric base
  group.add(box(span + 5, 1.4, 9.5, materials.substrate, 0, -2.1, 0));
  group.add(box(span + 4.4, 0.55, 8.8, materials.silicon, 0, -1.15, 0));

  // 6 vertical silicon fins (N3P FinFET)
  for (let i = 0; i < 6; i++) {
    const fx = (i - 2.5) * pitch * u * 0.68;
    const fin = box(0.42, 3.2, 7.6, materials.silicon, fx, 0.65, 0);
    group.add(fin);
    // Translucent cyan HfO2 high-k oxide collar around each fin under gate
    group.add(box(0.68, 3.38, 2.5, materials.hfo2 || materials.cyan, fx, 0.72, 0));
  }

  // Tri-gate metal wrap (TiN/W gate electrode across all fins)
  group.add(box(span * 0.78, 3.6, 1.9, materials.copper, 0, 0.95, 0));
  group.add(box(span * 0.8, 0.45, 2.0, materials.gold, 0, 2.95, 0));

  // Source & Drain epitaxial contacts + vertical vias
  group.add(box(span * 0.76, 1.2, 1.2, materials.gold, 0, 1.9, -2.9));
  group.add(box(span * 0.76, 1.2, 1.2, materials.gold, 0, 1.9, 2.9));

  // M0 23 nm pitch copper interconnect bars overhead
  for (let i = 0; i < 6; i++) {
    group.add(
      box(
        metal * u * 0.45,
        0.28,
        8.4,
        i % 2 === 0 ? materials.gold : materials.copper,
        (i - 2.5) * metal * u * 1.1,
        4.1,
        0,
      ),
    );
  }

  // Floating drifting channel electrons (cyan glowing spheres)
  const eGeo = new THREE.SphereGeometry(0.16, 12, 10);
  for (let i = 0; i < 12; i++) {
    const finIdx = i % 6;
    const fx = (finIdx - 2.5) * pitch * u * 0.68;
    const fz = -3.0 + (i / 11) * 6.0;
    const e = new THREE.Mesh(eGeo, materials.cyan || materials.accent);
    e.position.set(fx, 1.1 + (i % 3) * 0.55, fz);
    e.userData.drift = { baseZ: fz, finX: fx, speed: 1.8 + (i % 4) * 0.4 };
    group.add(e);
  }

  const label = partLabel("TSMC N3P FinFET · 48 nm CPP · 23 nm M0");
  label.scale.setScalar(0.45);
  label.position.set(0, 5.4, 0);
  group.add(label);

  return group;
}

/** 3D Silicon Diamond-Cubic Crystal (a = 0.5431020511 nm) with sp3 covalent bonds. */
export function buildLattice(materials) {
  const group = new THREE.Group();
  group.name = "lattice";
  const a = 3.6;
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
  const geo = new THREE.SphereGeometry(0.36, 22, 18);
  const haloGeo = new THREE.SphereGeometry(0.54, 14, 10);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x38d4f2, transparent: true, opacity: 0.14, wireframe: true });

  for (let ix = 0; ix < 2; ix++) {
    for (let iy = 0; iy < 2; iy++) {
      for (let iz = 0; iz < 2; iz++) {
        for (const [bx, by, bz] of basis) {
          const p = new THREE.Vector3((ix + bx) * a, (iy + by) * a, (iz + bz) * a);
          atoms.push(p);
          const core = put(
            new THREE.Mesh(geo, (bx * 4) % 2 === 1 ? materials.cyan || materials.accent : materials.accent),
            p.x,
            p.y,
            p.z,
          );
          core.userData.home = p.clone();
          group.add(core);
          if (ix === 0 && iy === 0 && iz === 0) {
            group.add(put(new THREE.Mesh(haloGeo, haloMat), p.x, p.y, p.z));
          }
        }
      }
    }
  }

  // Unit-cell bounding wireframe cube
  const boxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(a, a, a));
  const cage = new THREE.LineSegments(
    boxGeo,
    new THREE.LineBasicMaterial({ color: 0x38d4f2, transparent: true, opacity: 0.5 }),
  );
  cage.position.set(a / 2, a / 2, a / 2);
  group.add(cage);

  // Tetrahedral sp3 bonds (a * sqrt(3) / 4 = 0.23517 nm)
  const bond = (a * Math.sqrt(3)) / 4;
  const bondGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const d = atoms[i].distanceTo(atoms[j]);
      if (Math.abs(d - bond) > 0.25) continue;
      const mid = atoms[i].clone().add(atoms[j]).multiplyScalar(0.5);
      const cyl = new THREE.Mesh(bondGeo, materials.frame);
      cyl.scale.set(1, d, 1);
      cyl.position.copy(mid);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), atoms[j].clone().sub(atoms[i]).normalize());
      group.add(cyl);
    }
  }
  const center = new THREE.Vector3(a, a, a);
  group.position.copy(center.multiplyScalar(-1));
  return group;
}

/** 3D Quantum Wavefunction + WKB Tunnel Barrier + Dirac Electron/Positron Field. */
export function buildQuantumField(materials) {
  const group = new THREE.Group();
  group.name = "quantum";

  // Translucent gate-oxide WKB tunneling barrier slab
  const barrier = box(1.8, 5.2, 5.2, materials.hfo2 || materials.cyan, 1.4, 0, 0);
  group.add(barrier);

  // Incident -> evanescent -> transmitted complex wavefunction helix (64 nodes)
  const waveNodes = [];
  const wGeo = new THREE.SphereGeometry(0.14, 14, 10);
  for (let i = 0; i < 64; i++) {
    const u = i / 63;
    const x = -6 + u * 12;
    const m = new THREE.Mesh(
      wGeo,
      x < 0.5 ? materials.cyan || materials.accent : x < 2.3 ? materials.violet || materials.gold : materials.accent,
    );
    m.position.set(x, 0, 0);
    m.userData.waveX = x;
    waveNodes.push(m);
    group.add(m);
  }

  // Counter-spiraling relativistic electron (e-) & positron (e+) pair rings
  const eRing = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.04, 10, 64), materials.cyan || materials.accent);
  eRing.rotation.x = Math.PI / 3;
  const pRing = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.04, 10, 64), materials.positron || materials.accent);
  pRing.rotation.x = -Math.PI / 3;
  const electron = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), materials.cyan || materials.accent);
  const positron = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), materials.positron || materials.accent);
  group.add(eRing, pRing, electron, positron);

  const label = partLabel("ψ(x,t) WKB Tunneling · Dirac e⁻ / e⁺ Field");
  label.scale.setScalar(0.45);
  label.position.set(0, 3.8, 0);
  group.add(label);

  group.userData.animateQuantum = (t) => {
    for (const node of waveNodes) {
      const x = node.userData.waveX;
      let amp = 1.4;
      if (x > 0.5 && x < 2.3) amp = 1.4 * Math.exp(-(x - 0.5) * 1.15);
      else if (x >= 2.3) amp = 1.4 * Math.exp(-1.8 * 1.15);
      const phase = x * 2.1 - t * 3.8;
      node.position.y = amp * Math.cos(phase);
      node.position.z = amp * Math.sin(phase);
    }
    const a1 = t * 1.6;
    electron.position.set(
      Math.cos(a1) * 2.8,
      Math.sin(a1) * 2.8 * Math.cos(Math.PI / 3),
      Math.sin(a1) * 2.8 * Math.sin(Math.PI / 3),
    );
    const a2 = -t * 1.6 + Math.PI;
    positron.position.set(
      Math.cos(a2) * 2.8,
      Math.sin(a2) * 2.8 * Math.cos(-Math.PI / 3),
      Math.sin(a2) * 2.8 * Math.sin(-Math.PI / 3),
    );
  };
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
