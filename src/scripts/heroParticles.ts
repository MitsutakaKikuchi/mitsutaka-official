/**
 * ヒーロー背景の WebGL パーティクル（Three.js + カスタムシェーダー）。
 * 墨を流したような藍色の粒子がゆっくり漂い、マウスに反応して逃げる。
 * 「静と動」のコンセプトを保つため、動きは控えめ・低彩度に抑える。
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';

const CAMERA_Z = 6;
const FOV_DEG = 50;
const PARTICLE_COUNT_DESKTOP = 1400;
const PARTICLE_COUNT_MOBILE = 600;
const MOBILE_BREAKPOINT_PX = 768;
const ACCENT_COLOR = new Color('#1b3a5b');

const vertexShader = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float t = uTime * 0.12 + aSeed * 6.2831;

    // ゆっくりとした漂い（墨の揺らぎ）
    pos.x += sin(t + pos.y * 0.8) * 0.35;
    pos.y += cos(t * 0.8 + pos.x * 0.6) * 0.25;

    // マウスからの緩やかな反発
    vec2 delta = pos.xy - uMouse;
    float dist = length(delta);
    float force = smoothstep(1.4, 0.0, dist);
    pos.xy += normalize(delta + 0.0001) * force * 0.45;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (1.5 + aSeed * 3.5) * uPixelRatio * (6.0 / -mvPosition.z);
    vAlpha = 0.15 + 0.3 * aSeed;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, dist) * vAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * パーティクルを起動し、後始末用の関数を返す。
 * WebGL が使えない環境では何もしない no-op を返す。
 */
export function createHeroParticles(canvas: HTMLCanvasElement): () => void {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch {
    return () => {};
  }

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
  const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV_DEG, 1, 0.1, 20);
  camera.position.z = CAMERA_Z;

  // 視野に収まる平面サイズ（マウス座標のワールド変換にも使用）
  let halfHeight = Math.tan((FOV_DEG * Math.PI) / 360) * CAMERA_Z;
  let halfWidth = halfHeight;

  const positions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    seeds[i] = Math.random();
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: { x: 100, y: 100 } },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: ACCENT_COLOR },
    },
  });

  const points = new Points(geometry, material);
  scene.add(points);

  function resize(): void {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = clientWidth / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
    halfHeight = Math.tan((FOV_DEG * Math.PI) / 360) * CAMERA_Z;
    halfWidth = halfHeight * camera.aspect;
  }

  function onMouseMove(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    material.uniforms.uMouse.value.x = ndcX * halfWidth;
    material.uniforms.uMouse.value.y = ndcY * halfHeight;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove);

  const startTime = performance.now();
  renderer.setAnimationLoop(() => {
    material.uniforms.uTime.value = (performance.now() - startTime) / 1000;
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouseMove);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
