"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;

  // Lightweight value-noise for grain
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // Aspect-corrected centered coords (-aspect..+aspect, -1..+1)
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);

    // Slow orbital time
    float t = uTime * 0.04;

    // Two soft blobs drifting on independent orbits
    vec2 c1 = vec2(cos(t) * 0.55, sin(t * 0.8) * 0.35);
    vec2 c2 = vec2(sin(t * 1.2) * 0.65, cos(t * 0.6) * 0.45);
    vec2 c3 = vec2(cos(t * 0.5 + 1.7) * 0.4, sin(t * 0.9 + 0.3) * 0.5);

    float d1 = length(p - c1);
    float d2 = length(p - c2);
    float d3 = length(p - c3);

    // Gaussian-ish falloffs
    float g1 = exp(-d1 * d1 * 3.5);
    float g2 = exp(-d2 * d2 * 4.5);
    float g3 = exp(-d3 * d3 * 6.0);

    // Palette tuned to the glassmorphic UI: matches the sky / violet / amber pills
    vec3 bg     = vec3(0.027, 0.031, 0.047); // #07080c
    vec3 sky    = vec3(0.49,  0.83,  0.99);  // sky-300
    vec3 violet = vec3(0.66,  0.55,  0.98);  // violet-400
    vec3 amber  = vec3(0.99,  0.80,  0.40);  // amber-300

    vec3 color = bg;
    color += sky    * g1 * 0.11;
    color += violet * g2 * 0.09;
    color += amber  * g3 * 0.03;

    // A whisper of film grain to keep the gradient from banding
    float grain = (noise(vUv * 180.0 + uTime * 0.3) - 0.5) * 0.012;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function BackgroundShader() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    }),
    [],
  );

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function AmbientCanvas() {
  return (
    <Canvas
      aria-hidden
      orthographic
      camera={{ position: [0, 0, 1], zoom: 1 }}
      gl={{
        antialias: false,
        powerPreference: "low-power",
        alpha: false,
      }}
      dpr={[1, 1.5]}
      frameloop="always"
    >
      <BackgroundShader />
    </Canvas>
  );
}
