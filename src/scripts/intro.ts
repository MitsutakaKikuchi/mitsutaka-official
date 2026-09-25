/**
 * 開演演出（components/Intro.astro）の制御。
 *
 * 表示の可否は <head> のインラインスクリプトが描画前に判定し、<html> に .intro を付ける
 * （初回訪問のトップページのみ・reduced-motion／クローラー／自動操作では出さない）。
 * 演出本体は CSS アニメーションで完結しているため、ここでは
 * - クリック／キー／スクロールでのスキップ
 * - 終了後の後片付け
 * - ヒーロー演出を幕が開くタイミングまで遅らせるための introDelay()
 * のみを担う。
 */

/** 幕が半分ほど開き、ヒーローが見え始めるまでの秒数 */
const HERO_DELAY_S = 1.05;
const INTRO_TOTAL_MS = 2400;
const SKIP_FADE_MS = 320;

let finished = false;

declare global {
  interface Window {
    /** <head> のインラインスクリプトが記録する、開演演出の開始時刻（performance.now()） */
    __mkIntroT0?: number;
  }
}

/**
 * 開演演出が再生中なら、ヒーロー演出を遅らせる秒数を返す。
 * スクリプトの読み込みが遅れた場合に二重に待たせないよう、経過時間を差し引く。
 */
export function introDelay(): number {
  const root = document.documentElement;
  if (!root.classList.contains('intro') || root.classList.contains('intro-skip')) return 0;
  const elapsed = (performance.now() - (window.__mkIntroT0 ?? performance.now())) / 1000;
  return Math.max(0, HERO_DELAY_S - elapsed);
}

function finish(): void {
  if (finished) return;
  finished = true;
  document.documentElement.classList.remove('intro', 'intro-skip');
  document.getElementById('intro')?.remove();
}

export function initIntro(): void {
  const root = document.documentElement;
  if (!root.classList.contains('intro')) {
    // 演出が無い（または既に終わった）ページでは幕を DOM から外しておく
    document.getElementById('intro')?.remove();
    return;
  }
  finished = false;

  const skip = () => {
    if (root.classList.contains('intro-skip')) return;
    root.classList.add('intro-skip');
    window.setTimeout(finish, SKIP_FADE_MS);
  };

  const options: AddEventListenerOptions = { once: true, passive: true };
  window.addEventListener('pointerdown', skip, options);
  window.addEventListener('keydown', skip, options);
  window.addEventListener('wheel', skip, options);
  window.addEventListener('touchmove', skip, options);

  const elapsedMs = performance.now() - (window.__mkIntroT0 ?? performance.now());
  window.setTimeout(finish, Math.max(0, INTRO_TOTAL_MS - elapsedMs));
}
