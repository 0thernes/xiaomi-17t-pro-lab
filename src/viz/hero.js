import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/** Illustrative finishes for the three official color names. Not measured spectra. */
export const FINISHES = {
  Black: { glass: 0x161616, frame: 0x8d9298 },
  "Deep Violet": { glass: 0x2a1844, frame: 0x8a7c9a },
  "Deep Blue": { glass: 0x10243f, frame: 0x8ea0b0 },
};

const SCALE = 0.01;

/**
 * PBR phone at the cited body size. Bloom and the PMREM studio are skipped
 * on the low tier. The screen shows this renderer’s frame time.
 */
export function mountHero(canvas, cap) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: cap.tier !== "low",
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(cap.pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12130f);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
  camera.position.set(1.05, 0.12, 4.35);
  camera.lookAt(0, 0, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  let environment = null;
  if (cap.tier !== "low") {
    environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
  }
  scene.add(new THREE.AmbientLight(0xffffff, cap.tier === "low" ? 0.7 : 0.25));
  const key = new THREE.DirectionalLight(0xfff1e0, cap.tier === "low" ? 1.4 : 2.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ec8d8, 0.6);
  rim.position.set(-3, 1, -2);
  scene.add(rim);

  const width = 77.5 * SCALE;
  const height = 162.2 * SCALE;
  const depth = 8.25 * SCALE;
  const phone = new THREE.Group();
  const litMetal = cap.tier === "low" ? 0.35 : 0.9;
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: FINISHES.Black.frame,
    metalness: litMetal,
    roughness: cap.tier === "low" ? 0.42 : 0.32,
    clearcoat: cap.tier === "low" ? 0 : 0.35,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: FINISHES.Black.glass,
    metalness: 0.04,
    roughness: 0.22,
    clearcoat: cap.tier === "low" ? 0.2 : 1,
    clearcoatRoughness: 0.2,
  });
  const body = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, depth * 0.28), frameMat);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.96, height * 0.97), glassMat);
  back.position.z = -depth / 2 - 0.001;
  back.rotation.y = Math.PI;

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 512;
  screenCanvas.height = 1024;
  const screenCtx = screenCanvas.getContext("2d");
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.88, height * 0.84),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0xffffff,
      emissiveMap: screenTexture,
      emissiveIntensity: cap.tier === "low" ? 1.6 : 1.15,
      roughness: 0.55,
    }),
  );
  screen.position.z = depth / 2 + 0.002;

  const island = new THREE.Mesh(
    new RoundedBoxGeometry(width * 0.46, height * 0.2, 0.018, 2, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0.5, roughness: 0.4 }),
  );
  island.position.set(0, height * 0.28, -depth / 2 - 0.012);
  const lenses = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a2830, metalness: 0.8, roughness: 0.15 }),
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set((i - 1) * 0.11, height * 0.28, -depth / 2 - 0.02);
    lenses.add(lens);
  }
  phone.add(body, back, screen, island, lenses);
  phone.position.y = 0.08;
  scene.add(phone);

  let composer = null;
  if (cap.tier !== "low") {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), cap.tier === "ultra" ? 0.32 : 0.2, 0.35, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const clock = new THREE.Clock();
  let frameMs = null;
  let raf = 0;
  let running = true;
  let frames = 0;

  function paintScreen() {
    const ctx = screenCtx;
    ctx.fillStyle = "#140e0c";
    ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
    ctx.fillStyle = "#f4f0e6";
    ctx.font = "600 54px Literata, serif";
    ctx.fillText("17T Pro", 40, 120);
    ctx.fillStyle = "#c8c2b4";
    ctx.font = "28px Outfit, sans-serif";
    ctx.fillText("2772 × 1280", 40, 180);
    ctx.fillStyle = "#e08a4f";
    ctx.font = "600 36px Outfit, sans-serif";
    ctx.fillText(frameMs == null ? "frame —" : `${frameMs.toFixed(1)} ms frame`, 40, 250);
    ctx.fillStyle = "#8ec8d8";
    ctx.font = "24px Outfit, sans-serif";
    ctx.fillText(`tier ${cap.tier}`, 40, 310);
    screenTexture.needsUpdate = true;
  }

  function resize() {
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 480;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
  }

  function frame() {
    if (!running) return;
    const t0 = performance.now();
    if (!cap.reducedMotion) phone.rotation.y = clock.getElapsedTime() * 0.25;
    resize();
    if (composer) composer.render();
    else renderer.render(scene, camera);
    frameMs = performance.now() - t0;
    frames += 1;
    if (frames % 12 === 0) paintScreen();
    raf = requestAnimationFrame(frame);
  }
  paintScreen();
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);
  raf = requestAnimationFrame(frame);

  return {
    get frameMs() {
      return frameMs;
    },
    setFinish(name) {
      const finish = FINISHES[name] || FINISHES.Black;
      frameMat.color.setHex(finish.frame);
      glassMat.color.setHex(finish.glass);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      composer?.dispose();
      pmrem.dispose();
      environment?.dispose();
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const material of materials) material.dispose?.();
        }
      });
      screenTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
