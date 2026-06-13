/**
 * サイト全体のモーション演出。
 * - Lenis: 慣性スクロール
 * - GSAP + ScrollTrigger: スクロール連動フェード／パララックス／マスク+ズームリビール
 * - キネティック・タイポグラフィ（.k-char）／SVGドローイング（[data-draw]）
 * - マグネティックボタン（[data-magnetic]）
 * - カスタムカーソル（マウスストーカー）
 * - 公演画像のスライドショー（[data-slideshow]）／ライトボックス（[data-lightbox]）
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

/* ---------- 公演画像のスライドショー（チラシ・写真が複数ある場合） ---------- */
let slideshowTimers: number[] = [];

function clearSlideshowTimers(): void {
  slideshowTimers.forEach((timer) => window.clearInterval(timer));
  slideshowTimers = [];
}

function initSlideshows(): void {
  if (prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>('[data-slideshow]').forEach((container) => {
    const slides = container.querySelectorAll<HTMLElement>('[data-slide]');
    if (slides.length < 2) return;
    const intervalMs = Number.parseInt(container.dataset.slideshow ?? '4000', 10);
    let current = 0;
    const timer = window.setInterval(() => {
      slides[current]?.classList.replace('opacity-100', 'opacity-0');
      current = (current + 1) % slides.length;
      slides[current]?.classList.replace('opacity-0', 'opacity-100');
    }, intervalMs);
    slideshowTimers.push(timer);
  });
}

/* ---------- ライトボックス（チラシ・公演写真の拡大表示） ---------- */
const SWIPE_THRESHOLD_PX = 40;

function showLightboxImage(dialog: HTMLDialogElement, index: number, images: string[]): number {
  const normalized = ((index % images.length) + images.length) % images.length;
  const image = dialog.querySelector<HTMLImageElement>('[data-lightbox-image]');
  if (image) {
    image.src = images[normalized] ?? '';
  }
  const hasMultiple = images.length > 1;
  dialog
    .querySelectorAll<HTMLButtonElement>('[data-lightbox-prev], [data-lightbox-next]')
    .forEach((button) => {
      button.hidden = !hasMultiple;
    });
  const counter = dialog.querySelector<HTMLElement>('[data-lightbox-counter]');
  if (counter) {
    counter.textContent = hasMultiple ? `${normalized + 1} / ${images.length}` : '';
    counter.hidden = !hasMultiple;
  }
  return normalized;
}

function initLightbox(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#lightbox');
  if (!dialog) return;

  // ナビゲーションボタンと背景クリックでの閉鎖は、ダイアログが
  // ビュー遷移をまたいで残る場合に二重登録しないよう一度だけ行う
  if (!dialog.dataset.bound) {
    dialog.dataset.bound = 'true';
    let images: string[] = [];
    let index = 0;

    dialog.addEventListener('lightbox:open', ((event: CustomEvent<{ images: string[]; alt: string }>) => {
      images = event.detail.images;
      const image = dialog.querySelector<HTMLImageElement>('[data-lightbox-image]');
      if (image) image.alt = event.detail.alt;
      index = showLightboxImage(dialog, 0, images);
      dialog.showModal();
    }) as EventListener);

    dialog.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => {
      index = showLightboxImage(dialog, index - 1, images);
    });
    dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => {
      index = showLightboxImage(dialog, index + 1, images);
    });
    dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());
    // ダイアログ自身（背景部分）のクリックで閉じる
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    // スマートフォンでのスワイプ操作で前後の画像に切り替える
    let touchStartX = 0;
    dialog.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0]?.clientX ?? 0;
    });
    dialog.addEventListener('touchend', (event) => {
      if (images.length < 2) return;
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const deltaX = touchEndX - touchStartX;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
      index = showLightboxImage(dialog, deltaX < 0 ? index + 1 : index - 1, images);
    });
  }

  document.querySelectorAll<HTMLButtonElement>('[data-lightbox]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      let images: string[] = [];
      try {
        images = JSON.parse(trigger.dataset.images ?? '[]');
      } catch {
        images = [];
      }
      if (images.length === 0) return;
      dialog.dispatchEvent(
        new CustomEvent('lightbox:open', {
          detail: { images, alt: trigger.getAttribute('aria-label') ?? '' },
        })
      );
    });
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

/* ---------- 「過去の出演をもっと見る」展開 ---------- */
function initPastMore(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-past-more]');
  if (!button) return;
  button.addEventListener('click', () => {
    document
      .querySelectorAll<HTMLElement>('[data-past-item].hidden')
      .forEach((item) => item.classList.remove('hidden'));
    button.parentElement?.remove();
    ScrollTrigger.refresh();
  });
}

/* ---------- スクロール進捗バー（ページ上部） ---------- */
function initScrollProgress(): void {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    bar.style.transform = `scaleX(${Math.min(progress, 1)})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
}

/* ---------- ページごとの初期化 ---------- */
function initPage(): void {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  initSmoothScroll();
  initReveals();
  initMaskReveals();
  initParallax();
  initKineticType();
  initMagnetic();
  initSvgDraw();
  initCursor();
  initSlideshows();
  initLightbox();
  initPastMore();
  initScrollProgress();
  void initParticles();
  ScrollTrigger.refresh();
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('astro:before-swap', () => {
  clearSlideshowTimers();
  destroyParticles?.();
  destroyParticles = null;
});
