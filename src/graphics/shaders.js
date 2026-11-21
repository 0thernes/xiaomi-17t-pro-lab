import * as THREE from "three";

/**
 * Custom WebGL2 GLSL Shaders for Xiaomi 17T Pro Lab v2.0.0:
 *  1. Physical Thin-Film Optical Diffraction Shader for the 140.57 mm² Dimensity 9500 die
 *  2. Live FLIR Ironbow Thermal Field Shader with animated isothermal contour bands
 *  3. Real-time Photonic / Quantum Wavefunction Beam Shader
 */

/**
 * Physical optical thin-film interference shader over the Kurnal silicon die map.
 * Shifts spectral copper/cyan/violet diffraction fringes as you orbit the die.
 */
export function makeThinFilmDieMaterial(baseMap) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: baseMap },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewDir;

      // Cosine palette approximating spectral thin-film diffraction (2 n d cos theta)
      vec3 spectral(float phase) {
        return 0.5 + 0.5 * cos(6.28318 * (phase + vec3(0.0, 0.33, 0.67)));
      }

      void main() {
        vec3 base = texture2D(uMap, vUv).rgb;
        float ndv = clamp(abs(dot(normalize(vNormalW), normalize(vViewDir))), 0.0, 1.0);
        float fresnel = pow(1.0 - ndv, 2.2);
        // Micro-grating diffraction term along copper BEOL tracks
        float grating = sin(vUv.x * 160.0) * sin(vUv.y * 160.0) * 0.08;
        float opd = 2.0 * 1.65 * (0.45 + 0.25 * grating) * ndv + 0.06 * sin(uTime * 0.7);
        vec3 irid = spectral(opd);
        // Subtle live scanline pulse sweeping across interconnect tracks
        float scan = smoothstep(0.96, 1.0, sin(vUv.y * 18.0 - uTime * 2.2) * 0.5 + 0.5);
        vec3 col = base * (0.86 + 0.35 * ndv) + irid * (0.14 + 0.32 * fresnel) + vec3(0.22, 0.83, 0.95) * scan * 0.14;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Live FLIR Ironbow Thermal Shader driven by a live 2D FDTD CanvasTexture.
 * Adds crisp animated isothermal contour rings & hotspot emissive bloom boost.
 */
export function makeThermalOverlayMaterial(thermalTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHeat: { value: thermalTex },
      uTime: { value: 0 },
      uOpacity: { value: 0.96 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uHeat;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec4 sampleCol = texture2D(uHeat, vUv);
        float lum = dot(sampleCol.rgb, vec3(0.299, 0.587, 0.114));
        // Sharp scientific isothermal contour lines at 10-degree intervals
        float iso = abs(fract(lum * 8.0) - 0.5);
        float line = 1.0 - smoothstep(0.0, 0.045, iso);
        // Subtle heat-haze glow on scorching hotspots
        float hot = smoothstep(0.72, 0.98, lum);
        float pulse = 0.5 + 0.5 * sin(uTime * 5.0 - lum * 12.0);
        vec3 col = sampleCol.rgb + vec3(1.0, 0.92, 0.72) * line * 0.16 + vec3(0.35, 0.12, 0.02) * hot * pulse;
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });
}

/**
 * Volumetric phase-propagating wave shader for 13.5 nm EUV beams & quantum tunneling helices.
 */
export function makeQuantumWaveMaterial(colorHex = 0x38d4f2) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uTime: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float wave = 0.55 + 0.45 * sin(vUv.y * 28.0 - uTime * 9.0);
        float core = exp(-pow((vUv.x - 0.5) * 4.2, 2.0));
        float edgeFade = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float alpha = core * wave * edgeFade * 0.82;
        gl_FragColor = vec4(uColor * (1.1 + 0.5 * wave), alpha);
      }
    `,
  });
}
