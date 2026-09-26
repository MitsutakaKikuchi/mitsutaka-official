/**
 * 「伝統 × 未来」のモーショングラフィック（2026-09 改修）。
 *
 * どの演出も「伝統の素材が、未来の媒体へ移り変わる瞬間」を一つずつ見せる。
 * - 開演（Intro.astro / intro.ts）: 定式幕が引かれ、光の走査線に溶ける
 * - 筆の一円相（[data-ensou]）: 穂先の毛まで描いた円相が一筆で書かれる（WebGL の光がそれをなぞる）
 * - 墨 → 色（[data-scan]）: 写真は墨一色で現れ、光の走査線が通った所から色づく
 * - 見出し（[data-brush]）: 筆で左から書かれるように、墨の滲みを解きながら現れる
 * - 欧文ラベル（[data-scramble]）: 文化譜の数字が走ってから文字に定まる（デコード）
 * - 幕開き（[data-curtain]）: 出演依頼の舞台に入ると、定式幕が片側へ畳まれて開く
 * - 透かし（[data-drift]）: 下層ページの大きな欧文がスクロールでゆっくり流れる
 *
 * すべて prefers-reduced-motion を尊重し、その場合は完成形を静的に表示する。
 * Astro View Transitions（astro:page-load / astro:before-swap / astro:after-swap）に対応。
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initIntro, introDelay } from './intro';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const heroDelay = (el: Element): number => (el.closest('#hero') ? introDelay() : 0);

/* ---------- 筆の一円相 ---------- */
const ENSOU_DRAW_S = 2.1;

function initInkEnsou(reduced: boolean): void {
  document.querySelectorAll<SVGSVGElement>('svg[data-ensou]').forEach((svg) => {
    const spine = svg.querySelector<SVGPathElement>('[data-ensou-spine]');
    if (!spine) return;
    const mode = svg.dataset.ensou;
    if (reduced || mode === 'static') {
      gsap.set(spine, { strokeDashoffset: 0 });
      svg.classList.add('is-drawn');
      return;
    }
    if (mode === 'scroll') {
      gsap.fromTo(
        spine,
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: svg.closest('footer, section') ?? svg,
            start: 'top 95%',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        }
      );
      return;
    }
    // 筆は置いた直後と抜く直前がゆっくり、中盤は勢いよく走る
    gsap.fromTo(
      spine,
      { strokeDashoffset: 1 },
      {
        strokeDashoffset: 0,
        duration: ENSOU_DRAW_S,
        ease: 'power2.inOut',
        delay: 0.2 + heroDelay(svg),
        onComplete: () => svg.classList.add('is-drawn'),
      }
    );
  });
}

/* ---------- 墨 → 色（光の走査線が通った所から色づく）---------- */
const SCAN_DURATION_S = 1.35;

const supportsBackdrop = (): boolean =>
  typeof CSS !== 'undefined' &&
  (CSS.supports('backdrop-filter', 'grayscale(1)') ||
    CSS.supports('-webkit-backdrop-filter', 'grayscale(1)'));

function initScanReveal(reduced: boolean): void {
  if (reduced || !supportsBackdrop()) return;
  document.querySelectorAll<HTMLElement>('[data-scan]').forEach((box) => {
    if (box.querySelector('.scan-veil')) return;
    // 墨色の膜（背後の写真をグレースケールにする）と、それを払っていく光の走査線
    const veil = document.createElement('span');
    veil.className = 'scan-veil';
    veil.setAttribute('aria-hidden', 'true');
    const line = document.createElement('span');
    line.className = 'scan-line';
    line.setAttribute('aria-hidden', 'true');
    box.append(veil, line);

    // マスクで現れる写真は、マスクが半分ほど開いてから走査を始める
    const masked = box.hasAttribute('data-mask-reveal') || box.closest('[data-mask-reveal]');
    const wait = (masked ? 0.8 : 0.25) + heroDelay(box);

    const timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        veil.remove();
        line.remove();
      },
    });
    timeline
      .fromTo(
        veil,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        { clipPath: 'inset(100% 0% 0% 0%)', duration: SCAN_DURATION_S, ease: 'power2.inOut' },
        0
      )
      .fromTo(
        line,
        { top: '0%', autoAlpha: 1 },
        { top: '100%', duration: SCAN_DURATION_S, ease: 'power2.inOut' },
        0
      )
      .to(line, { autoAlpha: 0, duration: 0.3 }, SCAN_DURATION_S - 0.2);

    ScrollTrigger.create({
      trigger: box,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.delayedCall(wait, () => timeline.play());
      },
    });
  });
}

/* ---------- 見出し: 筆で書かれるように現れる ---------- */
function initBrushHeadings(reduced: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-brush]').forEach((heading) => {
    if (reduced) {
      heading.classList.add('is-written');
      return;
    }
    heading.classList.remove('is-written');
    ScrollTrigger.create({
      trigger: heading,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.delayedCall(0.12 + heroDelay(heading), () => heading.classList.add('is-written'));
      },
    });
  });
}

/* ---------- 欧文ラベル: 文化譜の数字からデコード ---------- */
// 等幅書体で幅が変わらない字形のみ（数字は三味線の文化譜の勘所を表す）
const GLYPHS = '0123456789#+-/';
const SCRAMBLE_MS = 900;
const SCRAMBLE_FRAME_MS = 45;

function scrambleText(el: HTMLElement): void {
  const finalText = el.dataset.scrambleText ?? el.textContent ?? '';
  if (!finalText.trim()) return;
  el.dataset.scrambleText = finalText;

  // 読み上げには完成形の文字列だけを渡す（装飾扱いの要素はそのまま）
  let target = el;
  if (!el.closest('[aria-hidden="true"]')) {
    el.textContent = '';
    const spoken = document.createElement('span');
    spoken.className = 'sr-only';
    spoken.textContent = finalText;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    el.append(spoken, visual);
    target = visual;
  }

  const chars = [...finalText];
  // 左から順に定まりつつ、少しだけ前後する
  const settleAt = chars.map((_, index) => (index / chars.length) * 0.65 + Math.random() * 0.3);
  const start = performance.now();
  let lastSwap = 0;
  const step = (now: number) => {
    const progress = (now - start) / SCRAMBLE_MS;
    if (progress >= 1) {
      target.textContent = finalText;
      return;
    }
    if (now - lastSwap >= SCRAMBLE_FRAME_MS) {
      lastSwap = now;
      target.textContent = chars
        .map((char, index) =>
          char === ' ' || progress >= (settleAt[index] ?? 1)
            ? char
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        )
        .join('');
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initScramble(reduced: boolean): void {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.delayedCall(0.25 + heroDelay(el), () => scrambleText(el));
      },
    });
  });
}

/* ---------- 幕開き（出演依頼の舞台に入ると定式幕が引かれる）---------- */
function initCurtains(reduced: boolean): void {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-curtain]').forEach((veil) => {
    const host = veil.closest<HTMLElement>('[data-curtain-host]') ?? veil.parentElement;
    if (!host) return;
    // 既に画面に入っている（再読み込みで途中から表示した等）なら幕は出さない
    if (host.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const stripes = veil.querySelectorAll<HTMLElement>('.curtain-stripe');
    veil.classList.add('is-armed');
    gsap.set(veil, { autoAlpha: 1, '--scan': 0 });
    gsap.set(stripes, { xPercent: 0, scaleX: 1 });

    const timeline = gsap.timeline({
      paused: true,
      onComplete: () => veil.classList.remove('is-armed'),
    });
    // 引幕: 幕の端（右）から先に動き、縦縞が左端へ畳まれていく
    timeline
      .to(
        stripes,
        {
          xPercent: (index: number) => -100 * index,
          scaleX: 0.06,
          duration: 1.2,
          ease: 'power3.inOut',
          stagger: { each: 0.05, from: 'end' },
        },
        0
      )
      // 畳まれながら走査線に置き換わり、光に溶けて消える
      .to(veil, { '--scan': 1, duration: 0.6, ease: 'none' }, 0.5)
      .to(veil, { autoAlpha: 0, duration: 0.4, ease: 'power1.out' }, 1.3);

    ScrollTrigger.create({
      trigger: host,
      start: 'top 70%',
      once: true,
      onEnter: () => timeline.play(),
    });
  });
}

/* ---------- 下層ページの欧文透かしがスクロールで流れる ---------- */
function initDrift(reduced: boolean): void {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((el) => {
    gsap.fromTo(
      el,
      { xPercent: 0 },
      {
        xPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement ?? el,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  });
}

/* ---------- ページごとの初期化 ---------- */
function initMotion(): void {
  const reduced = prefersReducedMotion();
  initIntro();
  initInkEnsou(reduced);
  initScanReveal(reduced);
  initBrushHeadings(reduced);
  initScramble(reduced);
  initCurtains(reduced);
  initDrift(reduced);
}

// View Transitions は <html> の属性を新しいページのものに入れ替えるため、
// 描画前に JS 有効フラグ・慣性スクロール・カスタムカーソルのクラスを付け直す
// （付け直さないと、演出前の状態や OS 標準のカーソルが一瞬見えてしまう）
const PERSISTENT_ROOT_CLASS = /^(lenis|fx-cursor)/;
let persistedRootClasses: string[] = [];
document.addEventListener('astro:before-swap', () => {
  persistedRootClasses = [...document.documentElement.classList].filter((name) =>
    PERSISTENT_ROOT_CLASS.test(name)
  );
});
document.addEventListener('astro:after-swap', () => {
  document.documentElement.classList.add('js', ...persistedRootClasses);
});
document.addEventListener('astro:page-load', initMotion);
