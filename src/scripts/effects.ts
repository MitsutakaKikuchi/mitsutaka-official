/**
 * サイト全体のモーション演出。
 * - Lenis: 慣性スクロール
 * - GSAP + ScrollTrigger: スクロール連動フェード／パララックス／マスク演出
 * - キネティック・タイポグラフィ（.k-char）／SVGドローイング（[data-draw]）
 * - カスタムカーソル（マウスストーカー）
 * すべて prefers-reduced-motion を尊重し、無効時は静的表示にフォールバックする。
 * Astro View Transitions（astro:page-load / astro:before-swap）に対応。
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const REVEAL_OFFSET_PX = 28;
const RING_LERP = 0.16;

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = (): boolean => window.matchMedia('(pointer: fine)').matches;

/*
 * ページ単位で登録する gsap.ticker コールバック。
 * View Transitions で要素が破棄されても ticker は残り続けるため、
 * astro:before-swap でまとめて解除する。
 */
const pageTickers: gsap.TickerCallback[] = [];

function addPageTicker(callback: gsap.TickerCallback): void {
  gsap.ticker.add(callback);
  pageTickers.push(callback);
}

function clearPageTickers(): void {
  pageTickers.forEach((callback) => gsap.ticker.remove(callback));
  pageTickers.length = 0;
}

/* ---------- 慣性スクロール ---------- */
let lenis: Lenis | null = null;

function initSmoothScroll(): void {
  if (lenis || prefersReducedMotion()) return;
  lenis = new Lenis({ lerp: 0.12, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/* ---------- スクロール連動フェードイン ---------- */
function initReveals(): void {
  const reduced = prefersReducedMotion();
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (reduced) {
      gsap.set(el, { autoAlpha: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: REVEAL_OFFSET_PX },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });
}

/* ---------- マスク演出（画像のクリップ表示 + ズームリビール） ---------- */
const ZOOM_REVEAL_FROM = 1.25;
const ZOOM_REVEAL_TO = 1.08; // パララックス移動による見切れを防ぐため少し拡大したまま残す

function initMaskReveals(): void {
  const reduced = prefersReducedMotion();
  document.querySelectorAll<HTMLElement>('[data-mask-reveal]').forEach((el) => {
    const zoomTarget = el.querySelector<HTMLElement>('[data-zoom]');
    if (reduced) {
      gsap.set(el, { clipPath: 'inset(0% 0% 0% 0%)' });
      if (zoomTarget) gsap.set(zoomTarget, { scale: ZOOM_REVEAL_TO });
      return;
    }
    gsap.fromTo(
      el,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.4,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      }
    );
    // マスクが開くのと同時に画像がゆっくり引いていく（ズームリビール）
    if (zoomTarget) {
      gsap.fromTo(
        zoomTarget,
        { scale: ZOOM_REVEAL_FROM },
        {
          scale: ZOOM_REVEAL_TO,
          duration: 1.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }
      );
    }
  });
}

/* ---------- パララックス ---------- */
function initParallax(): void {
  if (prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = Number.parseFloat(el.dataset.parallax ?? '0.15');
    gsap.to(el, {
      yPercent: speed * -100,
      ease: 'none',
      scrollTrigger: {
        trigger: el.parentElement ?? el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

/* ---------- キネティック・タイポグラフィ ---------- */
function initKineticType(): void {
  const chars = document.querySelectorAll<HTMLElement>('.k-char');
  if (chars.length === 0) return;
  if (prefersReducedMotion()) {
    gsap.set(chars, { autoAlpha: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    chars,
    { autoAlpha: 0, y: '0.5em', filter: 'blur(10px)' },
    {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.07,
      delay: 0.35,
    }
  );
}

/* ---------- 無限マーキー（スクロール速度・方向に反応） ---------- */
const MARQUEE_BASE_SPEED = 0.7; // px/frame
const MARQUEE_VELOCITY_GAIN = 0.25;
const MARQUEE_MAX_BOOST = 9;
const MARQUEE_DIR_LERP = 0.06;

function initMarquee(): void {
  if (prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((el) => {
    const track = el.querySelector<HTMLElement>('.marquee-track');
    if (!track) return;
    // トラックは同一グループ2周分。半周分進んだら巻き戻して無限ループに見せる
    const wrapX = gsap.utils.wrap(-track.scrollWidth / 2, 0);
    let x = 0;
    let direction = 1;
    let lastScrollY = window.scrollY;

    addPageTicker(() => {
      const velocity = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      // スクロール方向で流れる向きを反転（急反転しないよう lerp で馴染ませる）
      const targetDirection = velocity === 0 ? direction : Math.sign(velocity);
      direction += (targetDirection - direction) * MARQUEE_DIR_LERP;
      const boost = Math.min(Math.abs(velocity) * MARQUEE_VELOCITY_GAIN, MARQUEE_MAX_BOOST);
      x = wrapX(x - (MARQUEE_BASE_SPEED + boost) * direction);
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    });
  });
}

/* ---------- マグネティックボタン（カーソルに吸い付く） ---------- */
const MAGNET_STRENGTH = 0.32;

function initMagnetic(): void {
  if (!hasFinePointer() || prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });

    el.addEventListener('mousemove', (event) => {
      const rect = el.getBoundingClientRect();
      xTo((event.clientX - (rect.left + rect.width / 2)) * MAGNET_STRENGTH);
      yTo((event.clientY - (rect.top + rect.height / 2)) * MAGNET_STRENGTH);
    });

    el.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/* ---------- SVG ラインドローイング ---------- */
function initSvgDraw(): void {
  document.querySelectorAll<SVGGeometryElement>('[data-draw]').forEach((path) => {
    const length = path.getTotalLength();
    if (prefersReducedMotion()) {
      gsap.set(path, { strokeDasharray: 'none', strokeDashoffset: 0 });
      return;
    }
    gsap.fromTo(
      path,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', delay: 0.2 }
    );
  });
}

/* ---------- カスタムカーソル（マウスストーカー） ---------- */
const RING_SCALE_ACTIVE = 1.6;
const RING_SCALE_LERP = 0.2;

let cursorBound = false;
let mouseX = -100;
let mouseY = -100;
let ringX = -100;
let ringY = -100;
let ringScale = 1;
let ringScaleTarget = 1;

function ensureCursorElements(): void {
  if (!document.getElementById('cursor-dot')) {
    const dot = document.createElement('div');
    dot.id = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
  }
  if (!document.getElementById('cursor-ring')) {
    const ring = document.createElement('div');
    ring.id = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
  }
}

function initCursor(): void {
  if (!hasFinePointer() || prefersReducedMotion()) return;
  // View Transitions で body が入れ替わるたびに要素を再生成する
  ensureCursorElements();
  document.documentElement.classList.add('fx-cursor');

  if (cursorBound) return;
  cursorBound = true;

  window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  // リンク・ボタン上ではリングを拡大する（拡大も lerp で行いズレを防ぐ）
  document.addEventListener('mouseover', (event) => {
    const target = (event.target as HTMLElement).closest('a, button');
    ringScaleTarget = target ? RING_SCALE_ACTIVE : 1;
  });

  gsap.ticker.add(() => {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    ringX += (mouseX - ringX) * RING_LERP;
    ringY += (mouseY - ringY) * RING_LERP;
    ringScale += (ringScaleTarget - ringScale) * RING_SCALE_LERP;
    // translate(-50%, -50%) で常に円の中心をカーソル位置に合わせる
    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale})`;
    ring.style.opacity = String(ringScaleTarget > 1 ? 0.6 : 1);
  });
}

/* ---------- WebGL パーティクル（ホームのヒーローのみ） ---------- */
let destroyParticles: (() => void) | null = null;

async function initParticles(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#hero-canvas');
  if (!canvas || prefersReducedMotion()) return;
  // Three.js はホームページでのみ動的読込（他ページのバンドルを軽量に保つ）
  const { createHeroParticles } = await import('./heroParticles');
  destroyParticles = createHeroParticles(canvas);
}

/* ---------- ページごとの初期化 ---------- */
function initPage(): void {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  initSmoothScroll();
  initReveals();
  initMaskReveals();
  initParallax();
  initKineticType();
  initMarquee();
  initMagnetic();
  initSvgDraw();
  initCursor();
  void initParticles();
  ScrollTrigger.refresh();
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('astro:before-swap', () => {
  clearPageTickers();
  destroyParticles?.();
  destroyParticles = null;
});
