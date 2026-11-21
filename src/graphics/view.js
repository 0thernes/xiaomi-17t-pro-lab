import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { agMaps, brushMaps } from "./pbr-maps.js";
import { makeThinFilmDieMaterial } from "./shaders.js";
import {
  buildBars,
  buildBoard,
  buildDie,
  buildFinfet,
  buildLattice,
  buildMac,
  buildPackage,
  buildPhone,
  buildQuantumField,
  buildThermalDieStage,
  buildTilerMesh,
  dieTexture,
  oledTexture,
  pcbTexture,
  setPhoneFinish,
} from "./subjects.js";

export async function mountView(canvas, cap) {
  const { renderer, backend } = createRenderer(canvas, cap);
  renderer.setPixelRatio(Math.min(cap.pixelRatio || window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x070a10, 1);
  canvas.dataset.backend = backend;

  const shadows = cap.tier === "high" || cap.tier === "ultra";
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = studioBackdrop();
  scene.fog = new THREE.FogExp2(0x080c14, 0.0012);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 4000);
  camera.position.set(18, 12, 46);

  // High-contrast 4-point optical lab lighting rig
  const key = new THREE.DirectionalLight(0xfff5ea, cap.tier === "low" ? 2.4 : 3.2);
  key.position.set(38, 56, 44);
  key.castShadow = shadows;
  if (shadows) {
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.04;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 260;
    key.shadow.camera.left = -130;
    key.shadow.camera.right = 130;
    key.shadow.camera.top = 130;
    key.shadow.camera.bottom = -130;
  }
  scene.add(key);

  const cyanRim = new THREE.DirectionalLight(0x52d6ff, 1.85);
  cyanRim.position.set(-42, 26, -34);
  scene.add(cyanRim);

  const warmRim = new THREE.DirectionalLight(0xff8e42, 1.35);
  warmRim.position.set(36, 14, -46);
  scene.add(warmRim);

  const fill = new THREE.HemisphereLight(0x88b4e6, 0x0c111b, cap.tier === "low" ? 0.95 : 0.6);
  scene.add(fill);

  let envTex = null;
  let pmrem = null;
  if (cap.tier !== "low") {
    pmrem = new THREE.PMREMGenerator(renderer);
    envTex = pmrem.fromScene(studioScene(), 0.035).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.95;
  }

  // Precision optical lab reticle floor (replaces muddy brown circle)
  const floorTex = reticleFloorTexture();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(360, 72),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: floorTex,
      roughness: 0.62,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -88;
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

  // Interactive 3D Raycast Probe (hover any inspectable part to highlight & click to focus)
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const probeBox = new THREE.BoxHelper(new THREE.Object3D(), 0x38d4f2);
  probeBox.visible = false;
  scene.add(probeBox);
  let hoveredMesh = null;
  let probeCallbacks = null;
  let pointerMoved = 0;

  function findInspectable(obj) {
    let cur = obj;
    while (cur && cur !== root) {
      if (cur.userData && cur.userData.inspect) return cur;
      cur = cur.parent;
    }
    return null;
  }

  function updateProbeHit(event) {
    if (!probeCallbacks) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(root.children, true);
    let target = null;
    for (const h of hits) {
      const insp = findInspectable(h.object);
      if (insp) {
        target = insp;
        break;
      }
    }
    if (target !== hoveredMesh) {
      hoveredMesh = target;
      if (target) {
        probeBox.setFromObject(target);
        probeBox.visible = true;
        canvas.style.cursor = "crosshair";
        probeCallbacks.onHover?.(target.userData.inspect, target);
      } else {
        probeBox.visible = false;
        canvas.style.cursor = "";
        probeCallbacks.onHover?.(null, null);
      }
    }
    return target;
  }

  function onCanvasMove(ev) {
    pointerMoved += Math.abs(ev.movementX || 0) + Math.abs(ev.movementY || 0);
    if (ev.buttons === 0) updateProbeHit(ev);
  }
  function onCanvasDown() {
    pointerMoved = 0;
  }
  function onCanvasClick(ev) {
    if (!probeCallbacks || pointerMoved > 8) return;
    const hit = updateProbeHit(ev);
    if (!hit) return;
    const box = new THREE.Box3().setFromObject(hit);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius * 3.1, 4.5);
    orbit.flyTo(radius, sphere.center);
    probeCallbacks.onSelect?.(hit.userData.inspect, hit);
  }
  function onCanvasLeave() {
    if (hoveredMesh) {
      hoveredMesh = null;
      probeBox.visible = false;
      canvas.style.cursor = "";
      probeCallbacks?.onHover?.(null, null);
    }
  }
  function onKeyReset(ev) {
    const tag = ev.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((ev.key === "r" || ev.key === "R") && !ev.ctrlKey && !ev.metaKey && framed) {
      fit(framed.object, framed.fill);
    }
  }
  canvas.addEventListener("pointermove", onCanvasMove);
  canvas.addEventListener("pointerdown", onCanvasDown);
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("pointerleave", onCanvasLeave);
  window.addEventListener("keydown", onKeyReset);

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize?.(w, h);
    if (framed && w > 2 && h > 2) fit(framed.object, framed.fill);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function loop(now) {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    frameMs = frameMs * 0.82 + Math.min(100, now - last) * 0.18;
    last = now;
    // Animate any ShaderMaterials with uTime uniform automatically
    const sec = now * 0.001;
    root.traverse((obj) => {
      const m = obj.material;
      if (m?.uniforms?.uTime) m.uniforms.uTime.value = sec;
    });
    onFrame?.(now);
    if (!cap.reducedMotion && orbit.auto) orbit.spin(0.0022);
    orbit.tick();
    if (probeBox.visible && hoveredMesh) probeBox.update();
    try {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    } catch (error) {
      composer = null;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      reportViewport(canvas, `Post-processing fell back to direct render (${error.message}).`);
    }
    frames += 1;
    if (frames === 12 && composer && !droppedComposer) {
      let brightest = 255;
      try {
        brightest = brightestPixel(renderer);
      } catch {
        brightest = 255;
      }
      if (brightest >= 12) return;
      droppedComposer = true;
      composer = null;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  }
  frame = requestAnimationFrame(loop);

  function fit(object, fillRatio) {
    object.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new THREE.Vector3());
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, size.y * 0.5, 1);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = Math.max(0.45, camera.aspect || 1);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const dist = (radius / Math.min(Math.sin(vFov / 2), Math.sin(hFov / 2))) * 0.96;
    camera.near = Math.max(0.05, dist * 0.012);
    camera.far = Math.max(800, dist + radius * 14);
    camera.updateProjectionMatrix();
    floor.position.y = bounds.min.y - Math.max(1.0, size.y * 0.035);
    const floorScale = Math.max(0.15, radius / 38);
    floor.scale.setScalar(floorScale);
    orbit.set(dist / Math.min(fillRatio, 0.95), sphere.center);
  }

  return {
    THREE,
    scene,
    camera,
    root,
    orbit,
    floor,
    get frameMs() {
      return frameMs;
    },
    setFrame(fn) {
      onFrame = fn;
    },
    enableProbe(callbacks) {
      probeCallbacks = callbacks;
    },
    look(distance, target = new THREE.Vector3()) {
      orbit.set(distance, target);
    },
    frame(object, fillRatio = 0.88) {
      framed = { object, fill: fillRatio };
      fit(object, fillRatio);
    },
    clear() {
      hoveredMesh = null;
      probeBox.visible = false;
      root.clear();
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      orbit.dispose();
      canvas.removeEventListener("pointermove", onCanvasMove);
      canvas.removeEventListener("pointerdown", onCanvasDown);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("pointerleave", onCanvasLeave);
      window.removeEventListener("keydown", onKeyReset);
      probeBox.geometry?.dispose?.();
      probeBox.material?.dispose?.();
      root.traverse((obj) => {
        obj.geometry?.dispose?.();
        const materials = obj.material ? [].concat(obj.material) : [];
        for (const material of materials) {
          for (const k of Object.keys(material)) {
            const value = material[k];
            if (value && value.isTexture) value.dispose();
          }
          material.dispose?.();
        }
      });
      floor.geometry.dispose();
      floor.material.dispose();
      floorTex.dispose();
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

function studioBackdrop() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#0b111e");
  gradient.addColorStop(0.42, "#121b2d");
  gradient.addColorStop(0.75, "#0a0f19");
  gradient.addColorStop(1, "#05070c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function reticleFloorTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 10, cx, cx, cx);
  grad.addColorStop(0, "#151f30");
  grad.addColorStop(0.55, "#0c121e");
  grad.addColorStop(0.88, "#070a10");
  grad.addColorStop(1, "rgba(7,10,16,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric calibration rings & crosshairs
  ctx.strokeStyle = "rgba(56, 212, 242, 0.14)";
  ctx.lineWidth = 1.5;
  for (const r of [90, 180, 270, 360, 440]) {
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(56, 212, 242, 0.08)";
  for (let a = 0; a < 12; a++) {
    const rad = (a * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * 40, cx + Math.sin(rad) * 40);
    ctx.lineTo(cx + Math.cos(rad) * 445, cx + Math.sin(rad) * 445);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createRenderer(canvas, cap) {
  const options = {
    canvas,
    antialias: cap.tier === "low",
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  };
  return { renderer: new THREE.WebGLRenderer(options), backend: "webgl2" };
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
  // Crisp selective bloom only for glowing emissive elements; NO muddy SAOPass halo!
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.24, 0.36, 0.84);
  composer.addPass(bloom);
  composer.addPass(new SMAAPass());
  composer.addPass(new OutputPass());
  return composer;
}

function studioScene() {
  const env = new THREE.Scene();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(22, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x0b101b, side: THREE.BackSide }),
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
  // Overhead cool laboratory softbox
  panel(12, 6, [0, 11, 0], [Math.PI / 2, 0, 0], 0xf0f6ff, 3.0);
  // Key warm-white reflector strip
  panel(6, 5, [9, 5, 7], [-0.25, -0.75, 0], 0xffe4cc, 2.5);
  // Signature Xiaomi orange rim strip
  panel(2.2, 8, [-10, 3, -2], [0, Math.PI / 2, 0], 0xff7722, 2.2);
  // Crisp laser cyan specular fill strip
  panel(7, 2.5, [-4, 4, 10], [0, Math.PI, 0], 0x56d8ff, 1.8);
  // Cool rear kick light
  panel(9, 3, [2, 6, -11], [0.2, 0, 0], 0xdce8ff, 2.0);
  return env;
}

function attachOrbit(canvas, camera) {
  const state = {
    theta: 0.48,
    phi: 1.02,
    radius: 48,
    targetTheta: 0.48,
    targetPhi: 1.02,
    targetRadius: 48,
    auto: false,
    target: new THREE.Vector3(),
    goalTarget: new THREE.Vector3(),
  };
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
    drag = { x: event.clientX, y: event.clientY, theta: state.targetTheta, phi: state.targetPhi };
    state.auto = false;
  }
  function move(event) {
    if (!drag) return;
    state.targetTheta = drag.theta - (event.clientX - drag.x) * 0.006;
    state.targetPhi = Math.min(1.52, Math.max(0.18, drag.phi - (event.clientY - drag.y) * 0.006));
  }
  function up() {
    drag = null;
  }
  function wheel(event) {
    event.preventDefault();
    state.targetRadius = Math.min(900, Math.max(1.2, state.targetRadius * (event.deltaY > 0 ? 1.08 : 0.92)));
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
    set auto(v) {
      state.auto = Boolean(v);
    },
    spin(d) {
      state.targetTheta += d;
    },
    pose(theta, phi, immediate = false) {
      if (theta != null) {
        state.targetTheta = theta;
        if (immediate) state.theta = theta;
      }
      if (phi != null) {
        const clamped = Math.min(1.5, Math.max(0.2, phi));
        state.targetPhi = clamped;
        if (immediate) state.phi = clamped;
      }
      if (immediate) apply();
    },
    set(radius, target) {
      state.radius = state.targetRadius = radius;
      state.target.copy(target);
      state.goalTarget.copy(target);
      apply();
    },
    flyTo(radius, target, theta = null, phi = null) {
      state.auto = false;
      state.targetRadius = Math.min(900, Math.max(1.5, radius));
      if (target) state.goalTarget.copy(target);
      if (theta != null) state.targetTheta = theta;
      if (phi != null) state.targetPhi = Math.min(1.5, Math.max(0.2, phi));
    },
    tick() {
      const k = 0.14;
      state.theta += (state.targetTheta - state.theta) * k;
      state.phi += (state.targetPhi - state.phi) * k;
      state.radius += (state.targetRadius - state.radius) * k;
      state.target.lerp(state.goalTarget, k);
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
  const brush = rich ? brushMaps() : null;
  const ag = rich ? agMaps() : null;
  const frame = new THREE.MeshPhysicalMaterial({
    color: 0xd0d9e6,
    metalness: rich ? 0.94 : 0.55,
    roughness: 0.24,
    normalMap: brush?.normal || null,
    normalScale: new THREE.Vector2(0.18, 0.18),
    roughnessMap: brush?.rough || null,
    clearcoat: rich ? 0.48 : 0,
    clearcoatRoughness: 0.26,
    anisotropy: rich ? 0.85 : 0,
  });
  const deco = new THREE.MeshPhysicalMaterial({
    color: 0x161c26,
    metalness: rich ? 0.86 : 0.45,
    roughness: 0.22,
    normalMap: brush?.normal || null,
    normalScale: new THREE.Vector2(0.12, 0.12),
    clearcoat: rich ? 0.72 : 0.2,
    clearcoatRoughness: 0.16,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe6f2ff,
    metalness: 0,
    roughness: 0.04,
    ior: 1.52,
    clearcoat: rich ? 1 : 0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: rich ? 0.14 : 0.22,
  });
  const screen = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: oledTexture(),
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const pcb = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.22,
    map: pcbTexture(),
  });
  const dieMap = dieTexture();
  const die = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: dieMap,
    roughness: 0.22,
    metalness: 0.65,
    iridescence: rich ? 0.85 : 0,
    iridescenceIOR: 1.65,
    iridescenceThicknessMinimum: 180,
    iridescenceThicknessMaximum: 480,
    clearcoat: rich ? 0.6 : 0,
  });
  const dieShader = makeThinFilmDieMaterial(dieMap);
  const silicon = new THREE.MeshPhysicalMaterial({
    color: 0x334766,
    metalness: 0.78,
    roughness: 0.18,
    iridescence: rich ? 0.45 : 0,
    iridescenceIOR: 1.5,
  });
  const copper = new THREE.MeshPhysicalMaterial({
    color: 0xd97d3b,
    metalness: rich ? 0.92 : 0.5,
    roughness: 0.24,
    clearcoat: rich ? 0.3 : 0,
  });
  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xf0c960,
    metalness: rich ? 0.95 : 0.5,
    roughness: 0.2,
  });
  const battery = new THREE.MeshStandardMaterial({ color: 0x161d27, roughness: 0.55, metalness: 0.35 });
  const rear = new THREE.MeshPhysicalMaterial({
    color: 0x5c3c72,
    metalness: 0.12,
    roughness: 0.32,
    normalMap: ag?.normal || null,
    normalScale: new THREE.Vector2(0.14, 0.14),
    roughnessMap: ag?.rough || null,
    clearcoat: rich ? 0.72 : 0.25,
    clearcoatRoughness: 0.32,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x091324,
    metalness: 0.12,
    roughness: 0.04,
    iridescence: rich ? 1 : 0,
    iridescenceIOR: 1.45,
    iridescenceThicknessMinimum: 160,
    iridescenceThicknessMaximum: 460,
    clearcoat: rich ? 1 : 0.2,
  });
  const substrate = new THREE.MeshStandardMaterial({ color: 0x111824, roughness: 0.52, metalness: 0.32 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xff7a1a,
    emissive: 0xff6900,
    emissiveIntensity: 0.95,
    roughness: 0.28,
    metalness: 0.25,
  });
  const cyan = new THREE.MeshStandardMaterial({
    color: 0x38d4f2,
    emissive: 0x22b8e6,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.2,
  });
  const violet = new THREE.MeshStandardMaterial({
    color: 0xa78bfa,
    emissive: 0x8b5cf6,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.2,
  });
  const positron = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    emissive: 0xf43f5e,
    emissiveIntensity: 1.0,
    roughness: 0.25,
    metalness: 0.2,
  });
  const hfo2 = new THREE.MeshPhysicalMaterial({
    color: 0x38d4f2,
    metalness: 0.05,
    roughness: 0.12,
    transparent: true,
    opacity: 0.38,
    clearcoat: rich ? 0.8 : 0,
  });

  return {
    frame,
    deco,
    glass,
    screen,
    pcb,
    silicon,
    copper,
    gold,
    battery,
    rear,
    lens,
    substrate,
    die,
    dieShader,
    accent,
    cyan,
    violet,
    positron,
    hfo2,
    tier,
  };
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
    tex.repeat.set(12, 28);
  }
  materials.frame.normalMap = normal;
  materials.frame.normalScale = new THREE.Vector2(0.1, 0.1);
  materials.frame.roughnessMap = rough;
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
  buildQuantumField,
  buildThermalDieStage,
  buildTilerMesh,
  setPhoneFinish,
};
