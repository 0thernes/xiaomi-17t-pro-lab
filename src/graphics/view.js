import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import {
  buildBars,
  buildBoard,
  buildDie,
  buildFinfet,
  buildLattice,
  buildMac,
  buildPackage,
  buildPhone,
  buildTilerMesh,
  dieTexture,
  oledTexture,
  pcbTexture,
} from "./subjects.js";

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
    preserveDrawingBuffer: true,
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
    key.shadow.camera.left = -140;
    key.shadow.camera.right = 140;
    key.shadow.camera.top = 140;
    key.shadow.camera.bottom = -140;
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

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(280, 64),
    new THREE.MeshStandardMaterial({ color: 0x12110f, roughness: 0.92, metalness: 0.04 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -86;
  floor.receiveShadow = true;
  scene.add(floor);
  let composer = cap.tier === "low" ? null : makeComposer(renderer, scene, camera, cap);
  let droppedComposer = false;
  const root = new THREE.Group();
  scene.add(root);
  const orbit = attachOrbit(canvas, camera, cap.reducedMotion);

  let frame = 0;
  let frames = 0;
  let last = performance.now();
  let frameMs = 16;
  let running = true;
  let onFrame = null;

  let framed = null;
  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    if (framed && w > 2 && h > 2) fit(framed.object, framed.fill);
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
    try {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    } catch (error) {
      composer = null;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      reportViewport(canvas, `The post-process chain threw (${error.message}). Showing the scene directly.`);
    }
    frames += 1;
    if (frames === 12 && composer && !droppedComposer && brightestPixel(renderer) < 12) {
      droppedComposer = true;
      composer = null;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      reportViewport(
        canvas,
        "The post-process chain returned a black frame. Showing the scene without it. Reload if this stays empty.",
      );
    }
  }
  frame = requestAnimationFrame(loop);

  function fit(object, fill) {
    object.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = Math.max(0.4, camera.aspect || 1);
    const distY = size.y / 2 / Math.tan(vFov / 2);
    const distX = size.x / 2 / (Math.tan(vFov / 2) * aspect);
    orbit.set(Math.max(distX, distY, size.z) / fill + size.z * 0.2, center);
  }

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
    frame(object, fill = 0.9) {
      framed = { object, fill };
      fit(object, fill);
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

function brightestPixel(renderer) {
  const gl = renderer.getContext();
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  if (!width || !height) return 0;
  const pixel = new Uint8Array(4);
  let max = 0;
  for (const [x, y] of [
    [0.5, 0.5],
    [0.3, 0.4],
    [0.7, 0.6],
    [0.5, 0.75],
    [0.5, 0.25],
  ]) {
    gl.readPixels((width * x) | 0, (height * y) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    max = Math.max(max, pixel[0], pixel[1], pixel[2]);
  }
  return max;
}

function reportViewport(canvas, message) {
  const host = canvas.parentElement;
  if (!host || host.querySelector(".viewport-error")) return;
  const note = document.createElement("p");
  note.className = "viewport-error";
  note.setAttribute("role", "alert");
  note.textContent = message;
  host.append(note);
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
  // The beauty pass has to land in the buffer before SSAO. SSAOPass only
  // multiplies its occlusion texture onto the read buffer (DST_COLOR, ZERO).
  // With an empty read buffer that product is black, which is what the live
  // page showed on every high tier.
  composer.addPass(new RenderPass(scene, camera));
  if (cap.tier === "high" || cap.tier === "ultra") {
    try {
      const ssao = new SSAOPass(scene, camera, 512, 512, 16);
      ssao.kernelRadius = 8;
      ssao.minDistance = 0.001;
      ssao.maxDistance = 0.08;
      // It writes into the read buffer in place. Swapping would hand the next
      // pass the untouched black buffer.
      ssao.needsSwap = false;
      composer.addPass(ssao);
    } catch (error) {
      console.warn("SSAO disabled", error);
    }
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.16, 0.35, 0.94);
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
  const rich = tier !== "low";
  const frame = new THREE.MeshPhysicalMaterial({
    color: 0x8e939b,
    metalness: rich ? 0.92 : 0.45,
    roughness: 0.28,
    clearcoat: rich ? 0.45 : 0,
    clearcoatRoughness: 0.35,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.04,
    transmission: rich ? 0.82 : 0,
    thickness: 0.7,
    ior: 1.5,
    clearcoat: rich ? 1 : 0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: rich ? 1 : 0.18,
  });
  const screen = new THREE.MeshStandardMaterial({
    color: 0x050506,
    emissive: 0xffffff,
    emissiveMap: oledTexture(),
    emissiveIntensity: 0.9,
    roughness: 0.45,
  });
  const pcb = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.12,
    map: pcbTexture(),
  });
  const dieMap = dieTexture();
  const die = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: dieMap,
    roughness: 0.4,
    metalness: 0.45,
  });
  const silicon = new THREE.MeshPhysicalMaterial({
    color: 0x243044,
    metalness: 0.62,
    roughness: 0.22,
  });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: rich ? 0.85 : 0.4, roughness: 0.28 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe2c56a, metalness: rich ? 0.9 : 0.4, roughness: 0.22 });
  const battery = new THREE.MeshStandardMaterial({ color: 0x232824, roughness: 0.7, metalness: 0.15 });
  const rear = new THREE.MeshPhysicalMaterial({
    color: 0x1a1c20,
    metalness: 0.2,
    roughness: 0.18,
    clearcoat: rich ? 0.8 : 0,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x05070a,
    metalness: 0.1,
    roughness: 0.05,
    transmission: rich ? 0.4 : 0,
    opacity: rich ? 1 : 0.9,
    transparent: !rich,
  });
  const substrate = new THREE.MeshStandardMaterial({ color: 0x1c140c, roughness: 0.72, metalness: 0.2 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    emissive: 0xff7a1a,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  return { frame, glass, screen, pcb, silicon, copper, gold, battery, rear, lens, substrate, die, accent, tier };
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
  materials.frame.color.set(0x9aa0a8);
  materials.frame.needsUpdate = true;
  map.dispose();
}

export {
  buildBars,
  buildBoard,
  buildDie,
  buildFinfet,
  buildLattice,
  buildMac,
  buildPackage,
  buildPhone,
  buildTilerMesh,
};
