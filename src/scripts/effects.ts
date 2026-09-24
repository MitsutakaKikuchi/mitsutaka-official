/**
 * サイト全体のモーション演出（「古典 × 現代技術」方針）。
 * 和の意匠（墨・円相・縦書き）を保ちつつ、現代的なインタラクションを重ねて
 * 「伝統を弾き、いまを鳴らす」というコンセプトを動きでも表現する。
 * - Lenis: 慣性スクロール
 * - GSAP + ScrollTrigger: スクロール連動フェード／パララックス／マスク+ズームリビール
 * - キネティック・タイポグラフィ（.k-char）: 墨が立ち上がるように1字ずつ登場
 * - SVGドローイング（[data-draw]）: 筆で一筆書きされる円相・界線
 * - WebGL パーティクル（#hero-canvas）: 墨を流したような藍の粒子がマウスに反応
 * - マグネティックボタン（[data-magnetic]）: カーソルに吸い付く CTA
 * - カスタムカーソル: 落款の朱点 + 藍の輪（リンク上で朱に灯る）
 * - 公演画像のスライドショー（[data-slideshow]）／ライトボックス（[data-lightbox]）
 * - 落款リップル（#hero）: タップ／クリック位置に朱の印が捺されるように波紋が広がる（スマホ向け）
 * - 傾きパララックス（[data-tilt]）: スマホの傾きで額装写真が僅かに揺れる（対応端末のみ）
 * - スクロールドローイング（[data-draw-scroll]）: スクロール量に応じて筆が進む
 * - スティッキー CTA（#sticky-cta）: ファーストビューを過ぎると現れ、フッターで引っ込む
 * - ページローダー（#page-loader）: View Transitions のナビゲーション中に表示
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

/* ---------- キネティック・タイポグラフィ（墨が立ち上がる） ---------- */
// 墨の滲み（blur）を解きながら、1字ずつ下から静かに立ち上がる。
// 和の「間」を残しつつ、現代的なステージング表示で生命感を与える。
function initKineticType(): void {
  const chars = document.querySelectorAll<HTMLElement>('.k-char');
  if (chars.length === 0) return;
  if (prefersReducedMotion()) {
    gsap.set(chars, { autoAlpha: 1, y: 0, filter: 'blur(0px)' });
    return;
  }
  gsap.fromTo(
    chars,
    { autoAlpha: 0, y: '0.4em', filter: 'blur(8px)' },
    {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.09,
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

/* ---------- カスタムカーソル（落款の朱点 + 藍の輪） ---------- */
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

  // リンク・ボタン上では輪を拡大し、朱に灯す（落款を捺すイメージ）
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
    // 色の切替（藍→朱）は CSS の .is-active に委ねる
    ring.classList.toggle('is-active', ringScaleTarget > 1);
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
    // 画像ごとの代替テキスト（ギャラリー）。無ければトリガーの aria-label を共通で使う
    let alts: string[] = [];
    let fallbackAlt = '';
    const updateAlt = () => {
      const image = dialog.querySelector<HTMLImageElement>('[data-lightbox-image]');
      if (image) image.alt = alts[index] ?? fallbackAlt;
    };

    dialog.addEventListener('lightbox:open', ((
      event: CustomEvent<{ images: string[]; alt: string; start?: number; alts?: string[] }>
    ) => {
      images = event.detail.images;
      alts = event.detail.alts ?? [];
      fallbackAlt = event.detail.alt;
      index = showLightboxImage(dialog, event.detail.start ?? 0, images);
      updateAlt();
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
      updateAlt();
    });
    dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => {
      index = showLightboxImage(dialog, index + 1, images);
      updateAlt();
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
      updateAlt();
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
      let alts: string[] | undefined;
      try {
        alts = trigger.dataset.alts ? JSON.parse(trigger.dataset.alts) : undefined;
      } catch {
        alts = undefined;
      }
      dialog.dispatchEvent(
        new CustomEvent('lightbox:open', {
          detail: {
            images,
            alts,
            start: Number.parseInt(trigger.dataset.start ?? '0', 10) || 0,
            alt: trigger.getAttribute('aria-label') ?? '',
          },
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


/* ---------- 落款リップル（タップ位置に朱の印が捺される） ---------- */
function initSealRipple(): void {
  const hero = document.getElementById('hero');
  const layer = document.getElementById('hero-ripples');
  if (!hero || !layer || prefersReducedMotion()) return;
  hero.addEventListener(
    'pointerdown',
    (event) => {
      // ボタン・リンクのタップでは出さない（誤操作感を避ける）
      if ((event.target as HTMLElement).closest('a, button')) return;
      const rect = hero.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'seal-ripple';
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      layer.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      // 念のためのフォールバック
      window.setTimeout(() => ripple.remove(), 1400);
    },
    { passive: true }
  );
}

/* ---------- 傾きパララックス（スマホの傾きで額縁が揺れる） ---------- */
const TILT_MAX_DEG = 6;
let tiltHandler: ((event: DeviceOrientationEvent) => void) | null = null;

function initTilt(): void {
  if (tiltHandler) {
    window.removeEventListener('deviceorientation', tiltHandler);
    tiltHandler = null;
  }
  const targets = document.querySelectorAll<HTMLElement>('[data-tilt]');
  if (targets.length === 0 || hasFinePointer() || prefersReducedMotion()) return;
  if (!('DeviceOrientationEvent' in window)) return;
  // iOS 13+ は明示的な許可が必要（ユーザー操作起点でしか要求できない）ため、許可不要の端末のみ有効化
  const needsPermission =
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission ===
    'function';
  if (needsPermission) return;

  const setters = Array.from(targets).map((el) => ({
    x: gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power2.out' }),
    y: gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power2.out' }),
  }));
  targets.forEach((el) => gsap.set(el, { transformPerspective: 900 }));

  tiltHandler = (event) => {
    const beta = event.beta ?? 0; // 前後の傾き
    const gamma = event.gamma ?? 0; // 左右の傾き
    const rx = gsap.utils.clamp(-TILT_MAX_DEG, TILT_MAX_DEG, (beta - 45) * -0.15);
    const ry = gsap.utils.clamp(-TILT_MAX_DEG, TILT_MAX_DEG, gamma * 0.2);
    setters.forEach((set) => {
      set.x(rx);
      set.y(ry);
    });
  };
  window.addEventListener('deviceorientation', tiltHandler, { passive: true });
}

/* ---------- スクロールドローイング（スクロール量に応じて筆が進む） ---------- */
function initScrollDraw(): void {
  document.querySelectorAll<SVGGeometryElement>('[data-draw-scroll]').forEach((path) => {
    const length = path.getTotalLength();
    if (prefersReducedMotion()) {
      gsap.set(path, { strokeDasharray: 'none', strokeDashoffset: 0 });
      return;
    }
    gsap.fromTo(
      path,
      { strokeDasharray: length, strokeDashoffset: length },
      {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: path.closest('footer, section') ?? path,
          start: 'top 95%',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      }
    );
  });
}

/* ---------- 見出しの罫線（リビール時に左から引かれる） ---------- */
function initHeadingRules(): void {
  const reduced = prefersReducedMotion();
  document.querySelectorAll<HTMLElement>('.heading-rule').forEach((rule) => {
    if (reduced) {
      gsap.set(rule, { scaleX: 1 });
      return;
    }
    gsap.fromTo(
      rule,
      { scaleX: 0, transformOrigin: 'left center' },
      {
        scaleX: 1,
        duration: 1.2,
        ease: 'power3.inOut',
        delay: 0.2,
        scrollTrigger: { trigger: rule, start: 'top 90%', once: true },
      }
    );
  });
}

/* ---------- スマホ用スティッキー CTA ---------- */
let stickyCtaBound = false;

function initStickyCta(): void {
  const bar = document.getElementById('sticky-cta');
  if (!bar) return;
  const hero = document.getElementById('hero');
  const footer = document.querySelector('footer');

  const update = () => {
    // ヒーローがあるページはヒーローを過ぎてから、無いページは少しスクロールしたら表示
    const threshold = hero ? hero.offsetHeight * 0.75 : 240;
    const footerTop = footer ? footer.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
    const nearFooter = footerTop < window.innerHeight - 40;
    const visible = window.scrollY > threshold && !nearFooter;
    bar.classList.toggle('is-visible', visible);
    bar.setAttribute('aria-hidden', String(!visible));
    bar.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', visible ? '0' : '-1'));
  };

  if (!stickyCtaBound) {
    stickyCtaBound = true;
    window.addEventListener('scroll', () => update(), { passive: true });
    window.addEventListener('resize', () => update(), { passive: true });
  }
  update();
}

/* ---------- ページローダー（View Transitions のナビゲーション中） ---------- */
function showPageLoader(): void {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  loader.hidden = false;
  requestAnimationFrame(() => loader.classList.add('is-active'));
}

function hidePageLoader(): void {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  loader.classList.remove('is-active');
  window.setTimeout(() => {
    loader.hidden = true;
  }, 400);
}

/* ---------- 画像の読み込み状態（読み込み完了までプレースホルダーを表示） ---------- */
function initImageLoading(): void {
  document.querySelectorAll<HTMLImageElement>('img[data-slide], .yt-lite img').forEach((img) => {
    const markLoaded = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
    } else {
      img.addEventListener('load', markLoaded, { once: true });
    }
  });
}

/* ---------- 直近公演のカウントダウン（あと○日）---------- */
// ビルドは1日1回のため、日数は閲覧時にブラウザ側で計算する（日本時間の日付で比較）
const DAY_MS = 86_400_000;

function initCountdowns(): void {
  document.querySelectorAll<HTMLElement>('[data-countdown]').forEach((el) => {
    const target = Date.parse(`${el.dataset.countdown}T00:00:00+09:00`);
    if (Number.isNaN(target)) return;
    const todayJst = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
    const today = Date.parse(`${todayJst}T00:00:00+09:00`);
    const days = Math.round((target - today) / DAY_MS);
    if (days < 0) return;
    const label =
      days === 0
        ? el.dataset.labelToday
        : days === 1
          ? el.dataset.labelTomorrow
          : el.dataset.labelDays?.replace('{n}', String(days));
    if (label) el.textContent = `— ${label}`;
  });
}

/* ---------- ライトボックスのキーボード操作（← → で前後の画像）---------- */
let lightboxKeysBound = false;

function initLightboxKeys(): void {
  if (lightboxKeysBound) return;
  lightboxKeysBound = true;
  document.addEventListener('keydown', (event) => {
    const dialog = document.querySelector<HTMLDialogElement>('#lightbox');
    if (!dialog?.open) return;
    if (event.key === 'ArrowLeft') {
      dialog.querySelector<HTMLButtonElement>('[data-lightbox-prev]:not([hidden])')?.click();
    } else if (event.key === 'ArrowRight') {
      dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]:not([hidden])')?.click();
    }
  });
}

/* ---------- トップへ戻る ---------- */
function initToTop(): void {
  document.querySelectorAll<HTMLElement>('[data-to-top]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
      // キーボード利用者のためにフォーカスをページ先頭へ戻す
      document.getElementById('site-logo')?.focus({ preventScroll: true });
    });
  });
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
  initEventImageFallback();
  initSlideshows();
  initLightbox();
  initPastMore();
  initScrollProgress();
  initSealRipple();
  initTilt();
  initScrollDraw();
  initHeadingRules();
  initStickyCta();
  initImageLoading();
  initCountdowns();
  initLightboxKeys();
  initToTop();
  hidePageLoader();
  void initParticles();
  ScrollTrigger.refresh();
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('astro:before-preparation', showPageLoader);
document.addEventListener('astro:before-swap', () => {
  clearSlideshowTimers();
  destroyParticles?.();
  destroyParticles = null;
});
