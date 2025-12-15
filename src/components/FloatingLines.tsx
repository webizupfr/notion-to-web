"use client";

import { useEffect, useRef } from "react";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock,
} from "three";

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* -------------------------------------------------------------------------- */
/*  🎨 SHADER VERSION FOND CLAIR PREMIUM (IVOIRE + AMBRE DOUX)                */
/* -------------------------------------------------------------------------- */

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

/* --- Couleurs Impulsion Light ------------------------------------------- */

const vec3 WARM_IVORY  = vec3(248.0, 245.0, 237.0) / 255.0;
const vec3 PALE_AMBER  = vec3(255.0, 246.0, 210.0) / 255.0;
const vec3 SOFT_AMBER  = vec3(255.0, 222.0, 140.0) / 255.0;
const vec3 SOFT_SLATE  = vec3(15.0, 23.0, 42.0)  / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

/* --- Fond clair gradient Impulsion (version plus douce) ----------------- */
vec3 background_color(vec2 uv) {
  // vertical : ivoire -> ambre très léger
  float gy = smoothstep(-1.2, 0.9, uv.y);
  vec3 base = mix(WARM_IVORY, PALE_AMBER, gy * 0.7);

  // horizontal : petite touche d'ambre, moins marquée
  float gx = smoothstep(-0.2, 1.2, uv.x);
  base = mix(base, SOFT_AMBER, gx * 0.20);

  // vignette très légère vers un slate très faible
  float vignette = smoothstep(0.2, 1.3, length(uv * 0.9));
  base = mix(base, SOFT_SLATE * 0.06, vignette * 0.22);

  // on tire le tout vers l'ivoire pour rester proche du body
  base = mix(WARM_IVORY, base, 0.55);

  return base;
}

/* --- Couleur douce des lignes ------------------------------------------- */
vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;

  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);

    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];

    gradientColor = mix(c1, c2, f);
  }

  // lignes moins “flashy”
  return gradientColor * 0.30;
}

/* --- Forme de l'onde ----------------------------------------------------- */
float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

/* --- Render final -------------------------------------------------------- */
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;

  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  // Bottom – contribution un peu réduite
  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, col);

      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);

      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.12;
    }
  }

  // Top – contribution encore plus douce
  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, col);

      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;

      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.07;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;


const MAX_GRADIENT_STOPS = 8;

type WavePosition = {
  x: number;
  y: number;
  rotate: number;
};

type FloatingLinesProps = {
  linesGradient?: string[];
  enabledWaves?: Array<"top" | "middle" | "bottom">;
  lineCount?: number | number[];
  lineDistance?: number | number[];
  topWavePosition?: WavePosition;
  middleWavePosition?: WavePosition;
  bottomWavePosition?: WavePosition;
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  parallax?: boolean;
  parallaxStrength?: number;
};

type UniformValue = number | boolean | Vector2 | Vector3 | Vector3[];
type UniformMap = Record<string, { value: UniformValue }>;

function hexToVec3(hex: string): Vector3 {
  const value = hex.replace("#", "").trim();
  const r = parseInt(value.substring(0, 2), 16) / 255;
  const g = parseInt(value.substring(2, 4), 16) / 255;
  const b = parseInt(value.substring(4, 6), 16) / 255;
  return new Vector3(r, g, b);
}

export default function FloatingLines({
  linesGradient,
  enabledWaves = ["top", "bottom"],
  lineCount = [8, 8],
  lineDistance = [10, 10],
  topWavePosition,
  middleWavePosition,
  bottomWavePosition,
  animationSpeed = 0.6,
  interactive = false,
  bendRadius = 5.0,
  bendStrength = -0.4,
  parallax = false,
  parallaxStrength = 0.2,
}: FloatingLinesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: false, // on laisse le shader gérer le fond ivoire
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    containerRef.current.appendChild(renderer.domElement);

    // ⚠️ TOUJOURS 8 entrées pour lineGradient
    const gradientArray = Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1));

    const uniforms: UniformMap = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },

      animationSpeed: { value: animationSpeed },

      enableTop: { value: enabledWaves.includes("top") },
      enableMiddle: { value: false },
      enableBottom: { value: enabledWaves.includes("bottom") },

      topLineCount: {
        value: typeof lineCount === "number" ? lineCount : lineCount[0] ?? 6,
      },
      bottomLineCount: {
        value: typeof lineCount === "number" ? lineCount : lineCount[1] ?? 6,
      },
      middleLineCount: { value: 0 },

      topLineDistance: {
        value: typeof lineDistance === "number" ? lineDistance * 0.01 : (lineDistance[0] ?? 10) * 0.01,
      },
      bottomLineDistance: {
        value: typeof lineDistance === "number" ? lineDistance * 0.01 : (lineDistance[1] ?? 10) * 0.01,
      },
      middleLineDistance: { value: 0 },

      topWavePosition: {
        value: new Vector3(topWavePosition?.x ?? 6, topWavePosition?.y ?? 0.45, topWavePosition?.rotate ?? -0.4),
      },
      bottomWavePosition: {
        value: new Vector3(
          bottomWavePosition?.x ?? 3,
          bottomWavePosition?.y ?? -0.55,
          bottomWavePosition?.rotate ?? -0.3
        ),
      },
      middleWavePosition: {
        value: new Vector3(middleWavePosition?.x ?? 0, middleWavePosition?.y ?? 0, middleWavePosition?.rotate ?? 0),
      },

      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },

      parallax: { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },

      lineGradient: { value: gradientArray },
      lineGradientCount: { value: 0 },
    };

    if (linesGradient?.length) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;

      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        gradientArray[i].copy(color);
      });
    }

    const plane = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader, fragmentShader }));
    scene.add(plane);

    const clock = new Clock();

    const resize = () => {
      const el = containerRef.current;
      if (!el) return; // 👈 évite l'erreur quand le composant est démonté
      renderer.setSize(el.clientWidth, el.clientHeight);
      (uniforms.iResolution.value as Vector3).set(
        renderer.domElement.width,
        renderer.domElement.height,
        1
      );
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    let raf: number;
    const loop = () => {
      uniforms.iTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      plane.geometry.dispose();
      (plane.material as ShaderMaterial).dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [
    linesGradient,
    enabledWaves,
    lineCount,
    lineDistance,
    topWavePosition,
    middleWavePosition,
    bottomWavePosition,
    animationSpeed,
    interactive,
    bendRadius,
    bendStrength,
    parallax,
    parallaxStrength,
  ]);

  return <div ref={containerRef} className="w-full h-full relative overflow-hidden" />;
}
