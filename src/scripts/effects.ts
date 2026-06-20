/**
 * サイト全体のモーション演出（「和の所作」方針: 静・間・余韻を重んじる）。
 * - Lenis: 慣性スクロール
 * - GSAP + ScrollTrigger: スクロール連動フェード／パララックス／マスク+ズームリビール
 * - キネティック・タイポグラフィ（.k-char）: 墨が静かに置かれるような淡い登場
 * - SVGドローイング（[data-draw]）: 筆で一筆書きされる円相・界線
 * - 公演画像のスライドショー（[data-slideshow]）／ライトボックス（[data-lightbox]）
 * すべて prefers-reduced-motion を尊重し、無効時は静的表示にフォールバックする。
 * Astro View Transitions（astro:page-load / astro:before-swap）に対応。
 *
 * 制作会社サイト的なギミック（カスタムカーソル / マグネティックボタン /
 * マウス反応 WebGL パーティクル）は、和の伝統芸能の品格にそぐわないため撤去した。
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const REVEAL_OFFSET_PX = 28;

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/* ---------- 墨が置かれるように現れる見出し（旧キネティック・タイポ） ---------- */
// 文字が飛び跳ねる演出はやめ、墨が和紙にゆっくり滲み出るような静かな登場に。
// stagger を大きめ・duration を長めに取り「間（ま）」を作る。
function initKineticType(): void {
  const chars = document.querySelectorAll<HTMLElement>('.k-char');
  if (chars.length === 0) return;
  if (prefersReducedMotion()) {
    gsap.set(chars, { autoAlpha: 1, filter: 'blur(0px)' });
    return;
  }
  gsap.fromTo(
    chars,
    { autoAlpha: 0, filter: 'blur(6px)' },
    {
      autoAlpha: 1,
      filter: 'blur(0px)',
      duration: 1.6,
      ease: 'power2.out',
      stagger: 0.12,
      delay: 0.4,
    }
  );
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

/* ---------- 公演画像の読み込み失敗フォールバック ---------- */
/**
 * 読み込めなかった画像（Google ドライブ変換失敗・URL切れなど）は非表示にする。
 * カード内の全画像が失敗した場合は画像枠ごと隠し、テキストのみの表示に切り替える。
 */
function initEventImageFallback(): void {
  document.querySelectorAll<HTMLElement>('[data-event-images]').forEach((box) => {
    const images = Array.from(box.querySelectorAll<HTMLImageElement>('img'));
    let remaining = images.length;

    const handleFailure = (img: HTMLImageElement): void => {
      if (img.dataset.failed) return;
      img.dataset.failed = 'true';
      img.remove();
      remaining -= 1;
      // すべて失敗したら画像枠（ボタン）ごと隠す
      if (remaining <= 0) box.style.display = 'none';
    };

    images.forEach((img) => {
      // キャッシュ済みで既に失敗している画像も拾う
      if (img.complete && img.naturalWidth === 0) {
        handleFailure(img);
      } else {
        img.addEventListener('error', () => handleFailure(img));
      }
    });
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
      // 背景ページのスクロールを止める（Lenis慣性スクロール + ネイティブ両方）
      lenis?.stop();
      document.documentElement.classList.add('lightbox-open');
    }) as EventListener);

    // 閉じたとき（×ボタン / 背景クリック / Escキー いずれも）に背景スクロールを復帰
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('lightbox-open');
      lenis?.start();
    });

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
  initSvgDraw();
  initEventImageFallback();
  initSlideshows();
  initLightbox();
  initPastMore();
  initScrollProgress();
  ScrollTrigger.refresh();
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('astro:before-swap', () => {
  clearSlideshowTimers();
});
