/**
 * ヒーロー背景の WebGL パーティクル（Three.js + カスタムシェーダー）。
 * 夜の舞台の照明に浮かぶ塵のような藍の光の粒子（一部は朱の火の粉）がゆっくり漂い、マウス／タッチに反応して逃げる。
 * タップ・クリック時は uForce が一時的に高まり、波紋のように粒子が散る
 * （スマホでもポインタを持たずに「動き」を体感できる）。
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
// 夜の舞台に浮かぶ塵: 藍の光を基調に、ごく一部だけ朱の火の粉を混ぜる
const ACCENT_COLOR = new Color('#8fb3e0');
const EMBER_COLOR = new Color('#e0735f');
const EMBER_RATIO = 0.06;

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aEmber;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uForce;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vEmber;

  void main() {
    vEmber = aEmber;
    vec3 pos = position;
    float t = uTime * 0.12 + aSeed * 6.2831;

    // ゆっくりとした漂い（墨の揺らぎ）
    pos.x += sin(t + pos.y * 0.8) * 0.35;
    pos.y += cos(t * 0.8 + pos.x * 0.6) * 0.25;

    // マウス／タッチからの緩やかな反発。タップ時は uForce で範囲・強さが一時的に増す
    vec2 delta = pos.xy - uMouse;
    float dist = length(delta);
    float radius = 1.4 + uForce * 1.3;
    float force = smoothstep(radius, 0.0, dist);
    pos.xy += normalize(delta + 0.0001) * force * (0.45 + uForce * 0.9);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (1.5 + aSeed * 3.5) * uPixelRatio * (6.0 / -mvPosition.z);
    vAlpha = 0.12 + 0.4 * aSeed;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEmber;
  varying float vAlpha;
  varying float vEmber;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, dist) * vAlpha;
    gl_FragColor = vec4(mix(uColor, uEmber, vEmber), alpha);
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
  const embers = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    seeds[i] = Math.random();
    embers[i] = Math.random() < EMBER_RATIO ? 1 : 0;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geometry.setAttribute('aEmber', new BufferAttribute(embers, 1));

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: { x: 100, y: 100 } },
      uForce: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: ACCENT_COLOR },
      uEmber: { value: EMBER_COLOR },
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

  function setPointerFromClient(clientX: number, clientY: number): void {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    material.uniforms.uMouse.value.x = ndcX * halfWidth;
    material.uniforms.uMouse.value.y = ndcY * halfHeight;
  }

  // ポインタ（マウス・タッチ・ペン共通）で反発点を追従させる
  function onPointerMove(event: PointerEvent): void {
    setPointerFromClient(event.clientX, event.clientY);
  }

  // タップ／クリックで波紋のように粒子が一時的に大きく散る
  let ripple = 0;
  // タッチで指を離したあと、波紋が収まってから反発点を画面外へ戻すための保留フラグ。
  // すぐ戻すと素早いタップで波紋が見えないため（長押しした時だけ反応する不具合の原因）
  let touchPendingReset = false;
  function onPointerDown(event: PointerEvent): void {
    setPointerFromClient(event.clientX, event.clientY);
    ripple = 1;
    touchPendingReset = false;
  }

  // タッチは指を離しても即座には戻さず、波紋の再生を最後まで見せてから静かに落ち着かせる
  function onPointerUp(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      touchPendingReset = true;
    }
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });

  const startTime = performance.now();
  renderer.setAnimationLoop(() => {
    material.uniforms.uTime.value = (performance.now() - startTime) / 1000;
    // 波紋はフレームごとに減衰させ、タップ直後だけ強く反応する
    ripple *= 0.94;
    material.uniforms.uForce.value = ripple;
    // タッチ後、波紋が十分収まったら反発点を画面外へ戻して粒子を落ち着かせる
    if (touchPendingReset && ripple < 0.02) {
      material.uniforms.uMouse.value.x = 100;
      material.uniforms.uMouse.value.y = 100;
      touchPendingReset = false;
    }
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
