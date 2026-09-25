/**
 * ヒーロー背景の WebGL パーティクル（Three.js + カスタムシェーダー）。
 *
 * 二種類の粒子で「伝統を、光でなぞる」を表現する。
 * - 塵（ambient）: 夜の舞台の照明に浮かぶ藍の光の粒（一部は朱の火の粉）。ゆっくり漂う
 * - 円相（ring）: 筆の一円相（InkEnsou）が書かれていくのを追いかけるように集まり、
 *   以後は筆跡に沿って書き順の方向へ静かに流れ続ける（筆の軌跡を光が何度もなぞる）。
 *   筆の太い所には多く・明るく、抜き（細い所）では淡く集まる
 * スクロールでヒーローが退場し始めると、円相の粒子は火の粉のように舞い上がって散る。
 * マウス／タッチからは緩やかに逃げ、タップで波紋のように散る。
 * ヒーローが画面外にある間は描画ループを止める。
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
import { ENSOU_START_DEG, ENSOU_SWEEP_DEG, ENSOU_WEIGHT } from '../lib/brush';

const CAMERA_Z = 6;
const FOV_DEG = 50;
const PARTICLE_COUNT_DESKTOP = 1400;
const PARTICLE_COUNT_MOBILE = 600;
/** 円相に集まる粒子の割合 */
const RING_RATIO = 0.57;
const MOBILE_BREAKPOINT_PX = 768;
// 夜の舞台に浮かぶ塵: 藍の光を基調に、ごく一部だけ朱の火の粉を混ぜる
const ACCENT_COLOR = new Color('#8fb3e0');
const EMBER_COLOR = new Color('#e0735f');
// 円相の光: 筆（和紙色）に寄り添う、白に近い藍
const RING_COLOR = new Color('#dce7f4');
const EMBER_RATIO = 0.06;
/** 円相の粒子が筆跡を一周流れる速さ（1 秒あたりの進行度） */
const FLOW_SPEED = 0.017;
/** 集まる演出の長さ（筆の描画 2.1 秒を少し追いかける） */
const GATHER_DURATION_MS = 2600;
const GATHER_END = 1.25;

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aEmber;
  attribute float aRing;
  attribute float aU;
  attribute float aLane;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uForce;
  uniform float uPixelRatio;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uGather;
  uniform float uScatter;
  uniform float uStart;
  uniform float uSweep;
  uniform float uFlow;
  uniform float uWeight;
  varying float vAlpha;
  varying float vEmber;
  varying float vRing;

  void main() {
    vEmber = aEmber;
    vec3 ambient = position;
    float t = uTime * 0.12 + aSeed * 6.2831;

    // ゆっくりとした漂い（墨の揺らぎ）
    ambient.x += sin(t + ambient.y * 0.8) * 0.35;
    ambient.y += cos(t * 0.8 + ambient.x * 0.6) * 0.25;

    vec3 pos = ambient;
    float alpha = 0.12 + 0.4 * aSeed;
    float gathered = 0.0;

    if (aRing > 0.5) {
      // 筆跡に沿って書き順の方向へ流れる（u: 0 = 入り, 1 = 抜き）
      float u = fract(aU + uTime * uFlow);
      float angle = -(uStart + uSweep * u); // SVG（y 下向き）→ WebGL（y 上向き）
      float width = (1.0 - 0.32 * u) * (1.0 - 0.88 * smoothstep(0.76, 1.0, u));
      float radius = uRadius * (1.0 - 0.03 * u * u) + aLane * uRadius * uWeight * width;
      vec2 ring = uCenter + vec2(cos(angle), sin(angle)) * radius;
      ring += vec2(sin(uTime * 0.9 + aSeed * 40.0), cos(uTime * 0.7 + aSeed * 23.0)) * 0.012;

      // スクロールで火の粉のように外へ・上へ舞い上がる
      vec2 outward = normalize(ring - uCenter + 0.0001);
      ring += outward * uScatter * (0.4 + aSeed * 1.4) + vec2(0.0, uScatter * (0.6 + aSeed * 1.8));

      // 筆がその位置を通り過ぎた頃に集まる
      gathered = smoothstep(aU * 0.85, aU * 0.85 + 0.22, uGather);
      pos = vec3(mix(ambient.xy, ring, gathered), mix(ambient.z, aSeed * 0.2 - 0.1, gathered));

      // ループの継ぎ目（抜き → 入り）で瞬間移動が見えないよう、端では淡くする
      float seam = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.92, 1.0, u));
      float ringAlpha = (0.22 + 0.55 * aSeed) * (0.3 + 0.7 * width) * seam;
      alpha = mix(alpha, ringAlpha, gathered) * (1.0 - uScatter * 0.55);
    }
    vRing = gathered;

    // マウス／タッチからの緩やかな反発。タップ時は uForce で範囲・強さが一時的に増す
    vec2 delta = pos.xy - uMouse;
    float dist = length(delta);
    float reach = 1.4 + uForce * 1.3;
    float force = smoothstep(reach, 0.0, dist);
    pos.xy += normalize(delta + 0.0001) * force * (0.45 + uForce * 0.9);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float size = mix(1.5 + aSeed * 3.5, 1.1 + aSeed * 2.6, gathered);
    gl_PointSize = size * uPixelRatio * (6.0 / -mvPosition.z);
    vAlpha = alpha;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEmber;
  uniform vec3 uRingColor;
  varying float vAlpha;
  varying float vEmber;
  varying float vRing;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, dist) * vAlpha;
    vec3 base = mix(uColor, uEmber, vEmber);
    gl_FragColor = vec4(mix(base, uRingColor, vRing), alpha);
  }
`;

export interface HeroParticlesOptions {
  /** 円相の粒子が集まり始めるまでの秒数（筆の描き始めに合わせる） */
  delay?: number;
  /** 粒子を重ねる筆の円相の基準円（InkEnsou の [data-ensou-guide]） */
  guide?: SVGGraphicsElement | null;
}

const easeInOutQuad = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/**
 * パーティクルを起動し、後始末用の関数を返す。
 * WebGL が使えない環境では何もしない no-op を返す。
 */
export function createHeroParticles(
  canvas: HTMLCanvasElement,
  options: HeroParticlesOptions = {}
): () => void {
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

  const { delay = 0, guide = null } = options;
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
  const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
  const ringCount = guide ? Math.round(particleCount * RING_RATIO) : 0;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV_DEG, 1, 0.1, 20);
  camera.position.z = CAMERA_Z;

  // 視野に収まる平面サイズ（マウス座標・円相位置のワールド変換にも使用）
  let halfHeight = Math.tan((FOV_DEG * Math.PI) / 360) * CAMERA_Z;
  let halfWidth = halfHeight;

  const positions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  const embers = new Float32Array(particleCount);
  const rings = new Float32Array(particleCount);
  const us = new Float32Array(particleCount);
  const lanes = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    seeds[i] = Math.random();
    const isRing = i < ringCount;
    rings[i] = isRing ? 1 : 0;
    embers[i] = !isRing && Math.random() < EMBER_RATIO ? 1 : 0;
    // 筆の太い所（前半）ほど多く集まるよう、進行度の分布を前寄りに偏らせる
    us[i] = 1 - Math.sqrt(1 - Math.random() * 0.96);
    // 筆幅の中の位置（中央ほど密に）
    lanes[i] = (Math.random() + Math.random() - 1) * 0.5;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geometry.setAttribute('aEmber', new BufferAttribute(embers, 1));
  geometry.setAttribute('aRing', new BufferAttribute(rings, 1));
  geometry.setAttribute('aU', new BufferAttribute(us, 1));
  geometry.setAttribute('aLane', new BufferAttribute(lanes, 1));

  const toRad = (deg: number): number => (deg * Math.PI) / 180;
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
      uRingColor: { value: RING_COLOR },
      uCenter: { value: { x: 0, y: 0 } },
      uRadius: { value: 2 },
      uGather: { value: 0 },
      uScatter: { value: 0 },
      uStart: { value: toRad(ENSOU_START_DEG) },
      uSweep: { value: toRad(ENSOU_SWEEP_DEG) },
      uFlow: { value: FLOW_SPEED },
      uWeight: { value: ENSOU_WEIGHT * 1.4 },
    },
  });

  const points = new Points(geometry, material);
  scene.add(points);

  /** 筆の円相（SVG）の画面上の位置と大きさを、WebGL のワールド座標に写す */
  function measureGuide(): void {
    if (!guide) return;
    const canvasRect = canvas.getBoundingClientRect();
    const rect = guide.getBoundingClientRect();
    if (canvasRect.width === 0 || rect.width === 0) return;
    const centerX = rect.left + rect.width / 2 - canvasRect.left;
    const centerY = rect.top + rect.height / 2 - canvasRect.top;
    material.uniforms.uCenter.value.x = ((centerX / canvasRect.width) * 2 - 1) * halfWidth;
    material.uniforms.uCenter.value.y = -((centerY / canvasRect.height) * 2 - 1) * halfHeight;
    material.uniforms.uRadius.value = (rect.width / 2 / canvasRect.width) * 2 * halfWidth;
  }

  function resize(): void {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = clientWidth / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
    halfHeight = Math.tan((FOV_DEG * Math.PI) / 360) * CAMERA_Z;
    halfWidth = halfHeight * camera.aspect;
    measureGuide();
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
  // タッチで指を離したあと、波紋が収まってから反発点を画面外へ戻すための保留フラグ
  let touchPendingReset = false;
  function onPointerDown(event: PointerEvent): void {
    setPointerFromClient(event.clientX, event.clientY);
    ripple = 1;
    touchPendingReset = false;
  }

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
  // Web フォントの読み込みで見出しの位置が変わっても、円相の位置を測り直す
  void document.fonts?.ready.then(measureGuide);
  const resizeObserver =
    'ResizeObserver' in window ? new ResizeObserver(() => resize()) : null;
  resizeObserver?.observe(canvas);

  const startTime = performance.now();
  const gatherStart = startTime + delay * 1000;

  const renderFrame = () => {
    const now = performance.now();
    material.uniforms.uTime.value = (now - startTime) / 1000;
    const gatherProgress = Math.min(1, Math.max(0, (now - gatherStart) / GATHER_DURATION_MS));
    material.uniforms.uGather.value = easeInOutQuad(gatherProgress) * GATHER_END;
    // ヒーローの退場具合（0 = 画面上端にぴったり, 1 = 完全に退場）で円相を散らす
    const rect = canvas.getBoundingClientRect();
    const exit = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
    const scatter = Math.min(1, Math.max(0, (exit - 0.02) / 0.5));
    material.uniforms.uScatter.value = scatter * scatter * (3 - 2 * scatter);
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
  };

  // ヒーローが見えている間だけ描画する（スクロールで本文へ進んだら GPU を休ませる）
  let running = false;
  const setRunning = (next: boolean) => {
    if (next === running) return;
    running = next;
    renderer.setAnimationLoop(next ? renderFrame : null);
  };
  setRunning(true);
  const visibilityObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => setRunning(Boolean(entry?.isIntersecting)), {
          rootMargin: '120px 0px',
        })
      : null;
  visibilityObserver?.observe(canvas);

  return () => {
    setRunning(false);
    visibilityObserver?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
