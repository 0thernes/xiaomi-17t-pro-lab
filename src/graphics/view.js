import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { floorplan, getSpecs, npuCounts, parseDieMm, parsePackageMm } from "../specs.js";

const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uTint: { value: new THREE.Vector3(1.04, 0.98, 0.92) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 uTint;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 x = max(c.rgb, 0.0);
      x = x / (x + 0.35);
      x = pow(x, vec3(0.96));
      x *= uTint;
      vec2 d = vUv - 0.5;
      float vig = 1.0 - dot(d, d) * 0.28;
      gl_FragColor = vec4(x * vig, c.a);
    }
  `,
};

export async function mountView(canvas, cap) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: cap.tier !== "low",
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(cap.pixelRatio || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cap.tier === "low" ? 1.15 : 1.02;
  renderer.setClearColor(0x090807, 1);
  const shadows = cap.tier === "high" || cap.tier === "ultra";
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 4000);
  camera.position.set(18, 12, 46);

  const key = new THREE.DirectionalLight(0xfff3e4, cap.tier === "low" ? 2.4 : 3.1);
  key.position.set(30, 48, 36);
  key.castShadow = shadows;
  if (shadows) {
    key.shadow.mapSize.set(cap.tier === "ultra" ? 2048 : 1024, cap.tier === "ultra" ? 2048 : 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 200;
    key.shadow.camera.left = -40;
    key.shadow.camera.right = 40;
    key.shadow.camera.top = 40;
    key.shadow.camera.bottom = -40;
  }
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff7a2a, 0.85);
  rim.position.set(-28, 16, -18);
  scene.add(rim);
  const cool = new THREE.DirectionalLight(0x9ecbff, 0.45);
  cool.position.set(-10, 8, 30);
  scene.add(cool);
  scene.add(new THREE.AmbientLight(0x2a241e, cap.tier === "low" ? 0.85 : 0.35));

  let envTex = null;
  let pmrem = null;
  if (cap.tier !== "low") {
    pmrem = new THREE.PMREMGenerator(renderer);
    envTex = pmrem.fromScene(studioScene(), 0.04).texture;
    scene.environment = envTex;
  }

  const composer = cap.tier === "low" ? null : makeComposer(renderer, scene, camera, cap);
  const root = new THREE.Group();
  scene.add(root);
  const orbit = attachOrbit(canvas, camera, cap.reducedMotion);

  let frame = 0;
  let last = performance.now();
  let frameMs = 16;
  let running = true;
  let onFrame = null;

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function loop(now) {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    frameMs = now - last;
    last = now;
    onFrame?.(now);
    if (!cap.reducedMotion && orbit.auto) orbit.spin(0.0016);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(loop);

  return {
    THREE,
    scene,
    camera,
    root,
    orbit,
    get frameMs() {
      return frameMs;
    },
    setFrame(fn) {
      onFrame = fn;
    },
    look(distance, target = new THREE.Vector3()) {
      orbit.set(distance, target);
    },
    clear() {
      root.clear();
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      orbit.dispose();
      root.traverse((obj) => {
        obj.geometry?.dispose?.();
        const materials = obj.material ? [].concat(obj.material) : [];
        for (const material of materials) {
          for (const key of Object.keys(material)) {
            const value = material[key];
            if (value && value.isTexture) value.dispose();
          }
          material.dispose?.();
        }
      });
      composer?.dispose();
      envTex?.dispose();
      pmrem?.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}

function makeComposer(renderer, scene, camera, cap) {
  const samples = cap.tier === "ultra" ? 4 : cap.tier === "high" ? 4 : 2;
  let target;
  try {
    target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples });
  } catch {
    target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 0 });
  }
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.18, 0.4, 0.92);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(GRADE));
  composer.addPass(new OutputPass());
  return composer;
}

function studioScene() {
  const env = new THREE.Scene();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(20, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x100e0c, side: THREE.BackSide }),
  );
  env.add(shell);
  const panel = (w, h, pos, rot, color, intensity) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    env.add(mesh);
  };
  panel(8, 4, [0, 10, 0], [Math.PI / 2, 0, 0], 0xfff6ea, 2.6);
  panel(5, 4, [8, 4, 6], [-0.3, -0.7, 0], 0xffd7b0, 2.2);
  panel(2, 7, [-9, 3, 1], [0, Math.PI / 2, 0], 0xff6a1a, 2.4);
  panel(6, 2, [0, 2, 10], [0, Math.PI, 0], 0xd7e6ff, 1.1);
  return env;
}

function attachOrbit(canvas, camera, reduced) {
  const state = { theta: 0.55, phi: 1.05, radius: 48, auto: !reduced, target: new THREE.Vector3() };
  let drag = null;
  function apply() {
    const { theta, phi, radius, target } = state;
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(target);
  }
  function down(event) {
    if (event.target !== canvas) return;
    drag = { x: event.clientX, y: event.clientY, theta: state.theta, phi: state.phi };
    state.auto = false;
  }
  function move(event) {
    if (!drag) return;
    state.theta = drag.theta + (event.clientX - drag.x) * 0.005;
    state.phi = Math.min(1.5, Math.max(0.25, drag.phi + (event.clientY - drag.y) * 0.005));
    apply();
  }
  function up() {
    drag = null;
  }
  function wheel(event) {
    event.preventDefault();
    state.radius = Math.min(800, Math.max(2, state.radius * (event.deltaY > 0 ? 1.06 : 0.94)));
    apply();
  }
  canvas.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  canvas.addEventListener("wheel", wheel, { passive: false });
  apply();
  return {
    get auto() {
      return state.auto;
    },
    spin(d) {
      state.theta += d;
      apply();
    },
    set(radius, target) {
      state.radius = radius;
      state.target.copy(target);
      apply();
    },
    dispose() {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
    },
  };
}

export function makeMaterials(tier) {
  const metalness = tier === "low" ? 0.35 : 0.82;
  const frame = new THREE.MeshPhysicalMaterial({
    color: 0xc4c7cc,
    metalness,
    roughness: 0.32,
    clearcoat: tier === "low" ? 0 : 0.35,
    clearcoatRoughness: 0.4,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x111114,
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
  });
  const screen = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xffffff,
    emissiveMap: screenTexture(),
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  const pcb = new THREE.MeshStandardMaterial({ color: 0x1d4d32, roughness: 0.72, metalness: 0.15, map: pcbTexture() });
  const silicon = new THREE.MeshPhysicalMaterial({
    color: 0x1a1c22,
    metalness: 0.55,
    roughness: 0.22,
    emissive: 0x221408,
    emissiveIntensity: 0.25,
  });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: metalness, roughness: 0.28 });
  const battery = new THREE.MeshStandardMaterial({ color: 0x2a2e28, roughness: 0.62, metalness: 0.2 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    emissive: 0xff6a1a,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });
  return { frame, glass, screen, pcb, silicon, copper, battery, accent, tier };
}

export async function applyMetalPlate(materials) {
  const loader = new THREE.TextureLoader();
  const base = new URL("../../assets/textures/cc0/metal_plate/", import.meta.url);
  const load = (file) =>
    new Promise((resolve, reject) => {
      loader.load(new URL(file, base).href, resolve, undefined, reject);
    });
  const [map, normal, rough] = await Promise.all([
    load("metal_plate_diff_1k.jpg"),
    load("metal_plate_nor_gl_1k.jpg"),
    load("metal_plate_rough_1k.jpg"),
  ]);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const tex of [map, normal, rough]) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.repeat.set(2, 4);
  }
  materials.frame.normalMap = normal;
  materials.frame.roughnessMap = rough;
  materials.frame.color.set(0xb7bcc4);
  materials.frame.needsUpdate = true;
  map.dispose();
}

function screenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1108;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#1a0c06");
  g.addColorStop(0.45, "#0c0b0a");
  g.addColorStop(1, "#140a06");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff7a1a";
  ctx.fillRect(0, 0, canvas.width, 10);
  ctx.fillStyle = "#f6efe6";
  ctx.font = "700 84px sans-serif";
  ctx.fillText("17T", 36, 220);
  ctx.font = "500 36px sans-serif";
  ctx.fillStyle = "#ffb07a";
  ctx.fillText("PRO", 36, 270);
  ctx.fillStyle = "#f6efe6";
  ctx.font = "400 28px sans-serif";
  ctx.fillText("2772 × 1280", 36, 980);
  ctx.fillText("144 Hz", 36, 1024);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function pcbTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1c4a30";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#c6a15a";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 37) % 256, 0);
    ctx.lineTo((i * 53) % 256, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Cited outer body. Internals follow the repair-manual stack and are labeled reconstruction. */
export function buildPhone(materials, explode = 0) {
  const specs = getSpecs();
  const W = specs.device.width_mm.value;
  const H = specs.device.height_mm.value;
  const T = specs.device.thickness_mm.value;
  const group = new THREE.Group();
  const e = explode;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, T, 4, 3.2), materials.frame);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(W - 1.2, H - 1.2, 0.45, 3, 2.4), materials.glass);
  glass.position.z = T / 2 + 0.2 + e * 18;
  group.add(glass);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 6, H - 10), materials.screen);
  screen.position.z = T / 2 - 0.2 + e * 10;
  group.add(screen);
  const cover = box(W - 0.6, H - 0.6, 0.6, materials.glass, 0, 0, -T / 2 - 0.2 - e * 16);
  group.add(cover);
  const board = box(W - 14, H * 0.42, 1.1, materials.pcb, 0, H * 0.12, e * 28);
  group.add(board);
  const pkg = parsePackageMm(specs);
  if (pkg) {
    const soc = box(
      pkg.widthMm,
      pkg.heightMm,
      Math.max(0.8, (pkg.thickMm || 0.45) * 4),
      materials.silicon,
      0,
      H * 0.16,
      1.2 + e * 36,
    );
    group.add(soc);
    const dram = box(pkg.widthMm - 1.2, pkg.heightMm - 1.2, 0.7, materials.accent, 0, H * 0.16, 2.2 + e * 44);
    group.add(dram);
  }
  const cellW = (W - 18) / 2 - 1;
  group.add(box(cellW, H * 0.46, 3.2, materials.battery, -cellW / 2 - 0.6, -H * 0.16, e * 22));
  group.add(box(cellW, H * 0.46, 3.2, materials.battery, cellW / 2 + 0.6, -H * 0.16, e * 22));
  group.add(box(W - 16, H * 0.5, 0.35, materials.copper, 0, -H * 0.02, 2.4 + e * 34));
  group.add(box(18, 18, 4, materials.frame, -W * 0.28, H * 0.32, -2 - e * 26));
  group.add(box(12, 12, 3.2, materials.frame, -W * 0.28, H * 0.18, -2 - e * 30));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(12, 0.7, 8, 28), materials.copper);
  coil.position.set(0, -H * 0.28, -1 - e * 20);
  group.add(coil);
  group.add(box(22, 6, 2, materials.accent, 0, H * 0.42, e * 8));
  group.add(box(22, 6, 2, materials.accent, 0, -H * 0.42, e * 8));
  group.add(box(8, 3, 2.4, materials.frame, 0, -H / 2 + 2, T / 2));
  group.name = "phone";
  return group;
}

export function buildDie(materials) {
  const plan = floorplan();
  const die = parseDieMm();
  const group = new THREE.Group();
  if (!plan || !die) return group;
  const scale = 4;
  const slab = box(die.widthMm * scale, die.heightMm * scale, 1.2, materials.silicon, 0, 0, 0);
  group.add(slab);
  const colors = { cpu: 0xff7a1a, gpu: 0x7eb6ff, npu: 0xd48cff };
  for (const block of plan.blocks) {
    const mesh = box(
      block.widthMm * scale * 0.96,
      block.heightMm * scale * 0.92,
      1.6,
      new THREE.MeshStandardMaterial({
        color: colors[block.id] || 0x888888,
        roughness: 0.45,
        metalness: 0.25,
        emissive: colors[block.id] || 0x000000,
        emissiveIntensity: 0.18,
      }),
      (block.xMm + block.widthMm / 2 - die.widthMm / 2) * scale,
      (block.yMm + block.heightMm / 2 - die.heightMm / 2) * scale,
      1.2,
    );
    mesh.name = block.id;
    group.add(mesh);
  }
  for (const core of plan.cores) {
    const mesh = box(
      core.sideMm * scale * 0.8,
      core.sideMm * scale * 0.8,
      2.2,
      materials.accent,
      (core.xMm + core.sideMm / 2 - die.widthMm / 2) * scale,
      (core.yMm + core.sideMm / 2 - die.heightMm / 2) * scale,
      2.2,
    );
    mesh.name = core.name;
    group.add(mesh);
  }
  group.name = "die";
  return group;
}

export function buildFinfet(materials) {
  const specs = getSpecs();
  const pitch = specs.soc.process_n3e_cpp_nm.value || 48;
  const metal = specs.soc.process_n3e_min_metal_pitch_nm.value || 23;
  const group = new THREE.Group();
  const unit = 0.12;
  for (let i = 0; i < 6; i++) {
    const fin = box(pitch * unit * 0.22, 8, 3.2, materials.silicon, (i - 2.5) * pitch * unit, 0, 0);
    group.add(fin);
  }
  const gate = box(pitch * unit * 6.4, 1.1, 4.2, materials.copper, 0, 2.2, 0);
  group.add(gate);
  for (let i = 0; i < 8; i++) {
    group.add(box(metal * unit * 0.35, 0.25, 10, materials.accent, 0, 3.2, (i - 3.5) * metal * unit));
  }
  group.name = "finfet";
  return group;
}

export function buildLattice(materials) {
  const group = new THREE.Group();
  const a = 4.2;
  const positions = [
    [0, 0, 0],
    [a / 2, a / 2, 0],
    [a / 2, 0, a / 2],
    [0, a / 2, a / 2],
  ];
  const geo = new THREE.SphereGeometry(0.55, 18, 14);
  for (const [x, y, z] of positions) {
    const atom = new THREE.Mesh(geo, materials.accent);
    atom.position.set(x - a / 4, y - a / 4, z - a / 4);
    group.add(atom);
  }
  group.name = "lattice";
  return group;
}

export function buildMac(materials, cells = 8) {
  const counts = npuCounts();
  const group = new THREE.Group();
  const n = cells;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const mesh = box(0.7, 0.7, 0.4, materials.silicon, x - n / 2, y - n / 2, 0);
      mesh.name = `mac-${x}-${y}`;
      group.add(mesh);
    }
  }
  const mdla = counts.mdla || 4;
  for (let i = 0; i < mdla; i++) {
    group.add(box(1.6, 0.45, 0.3, materials.accent, -n / 2 - 1.6, i * 1.2 - 2, 0));
  }
  group.name = "mac";
  return group;
}

export function buildTilerMesh(materials, image) {
  const group = new THREE.Group();
  const tex = new THREE.DataTexture(image.data, image.width, image.height);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
  );
  group.add(screen);
  group.name = "tiler";
  return group;
}

export function buildBars(materials, points) {
  const group = new THREE.Group();
  const max = Math.max(...points.map((p) => p.nsPerLoad || 0), 1);
  points.forEach((point, i) => {
    const h = 0.4 + 6 * ((point.nsPerLoad || 0) / max);
    group.add(box(0.7, h, 0.7, materials.accent, i * 1.1, h / 2, 0));
  });
  group.name = "cache";
  return group;
}
