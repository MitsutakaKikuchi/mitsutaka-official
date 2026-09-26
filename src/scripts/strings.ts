/**
 * 光の三本弦（components/Strings.astro）のインタラクション。
 * - ポインタが弦を横切ると、その位置・速さに応じて弦が弾かれ、減衰振動しながら光る
 * - タップ／クリックでも近くの弦が弾かれる（スクロール中のタッチ端末向け）
 * - 弦を走る光の信号（.shamisen-pulse）も振動に合わせて同じ形に追従する
 * - 画面外にある弦の CSS アニメーション（信号・数字）は一時停止して負荷を抑える
 * すべて prefers-reduced-motion を尊重し、無効時は何もしない（静止した光の線のまま）。
 */
import gsap from 'gsap';

interface StringState {
  el: SVGPathElement;
  /** 同じ弦を走る光の信号（振動に追従させる） */
  pulses: SVGPathElement[];
  group: SVGGElement;
  id: string;
  y: number;
  x0: number;
  x1: number;
  /** 弾いた位置（弦のローカル座標） */
  px: number;
  /** 初期振幅（符号は弾いた向き） */
  amp: number;
  /** 弾いた時刻（ms） */
  t0: number;
  /** 見た目の振動数（Hz）。太い弦ほど遅い */
  freq: number;
  active: boolean;
  host: HTMLElement;
}

const DAMPING = 2.4; // 振動の減衰の速さ
const MAX_AMP = 22;
const TAP_RADIUS = 36; // タップで弾ける弦との距離（viewBox 単位）
const VISUAL_FREQ: Record<string, number> = { '1': 5.5, '2': 7, '3': 8.5 };

let states: StringState[] = [];
let tickerBound = false;
let cleanups: (() => void)[] = [];

/* ---------- 弦の振動 ---------- */
function drawString(state: StringState, displacement: number): void {
  // 二次ベジェの制御点を弾いた位置に置く（頂点の変位は制御点の約半分になるため 2 倍）
  const d = `M${state.x0} ${state.y} Q${state.px.toFixed(1)} ${(state.y + displacement * 2).toFixed(2)} ${state.x1} ${state.y}`;
  state.el.setAttribute('d', d);
  state.pulses.forEach((pulse) => pulse.setAttribute('d', d));
}

function pluck(state: StringState, x: number, amp: number): void {
  // 振動中の弦を弱く撫でただけでは弾き直さない
  const now = performance.now();
  if (state.active && now - state.t0 < 90) return;
  state.px = gsap.utils.clamp(state.x0 + 200, state.x1 - 200, x);
  state.amp = gsap.utils.clamp(-MAX_AMP, MAX_AMP, amp);
  state.t0 = now;
  state.active = true;
  state.el.classList.add('is-plucked');
  window.setTimeout(() => state.el.classList.remove('is-plucked'), 160);
}

function tick(): void {
  const now = performance.now();
  for (const state of states) {
    if (!state.active) continue;
    const t = (now - state.t0) / 1000;
    const envelope = Math.exp(-t * DAMPING);
    if (Math.abs(state.amp) * envelope < 0.15) {
      state.active = false;
      drawString(state, 0);
      continue;
    }
    const displacement = state.amp * envelope * Math.cos(t * state.freq * Math.PI * 2);
    drawString(state, displacement);
  }
}

function toLocal(group: SVGGElement, clientX: number, clientY: number): DOMPoint | null {
  const matrix = group.getScreenCTM();
  if (!matrix) return null;
  return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
}

export function initStrings(): void {
  cleanups.forEach((fn) => fn());
  cleanups = [];
  states = [];

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 画面外の弦は CSS アニメーション（光の信号・文化譜の数字）を止める
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
        });
      },
      { rootMargin: '80px 0px' }
    );
    document.querySelectorAll('svg[data-strings]').forEach((svg) => observer.observe(svg));
    cleanups.push(() => observer.disconnect());
  }

  document.querySelectorAll<SVGSVGElement>('svg[data-strings]').forEach((svg) => {
    const group = svg.querySelector<SVGGElement>('[data-strings-group]') ?? svg.querySelector<SVGGElement>('g');
    const host = svg.closest<HTMLElement>('[data-strings-host]') ?? svg.parentElement;
    if (!group || !host) return;

    const local: StringState[] = Array.from(
      svg.querySelectorAll<SVGPathElement>('[data-string]')
    ).map((el) => {
      const id = el.dataset.string ?? '2';
      return {
        el,
        pulses: Array.from(svg.querySelectorAll<SVGPathElement>(`[data-pulse-for="${id}"]`)),
        group,
        id,
        y: Number(el.dataset.y),
        x0: Number(el.dataset.x0),
        x1: Number(el.dataset.x1),
        px: 600,
        amp: 0,
        t0: 0,
        freq: VISUAL_FREQ[id] ?? 7,
        active: false,
        host,
      };
    });
    states.push(...local);

    let last: DOMPoint | null = null;

    const onMove = (event: PointerEvent) => {
      const point = toLocal(group, event.clientX, event.clientY);
      if (!point) return;
      if (last) {
        const dy = point.y - last.y;
        for (const state of local) {
          // 前フレームと今フレームの間で弦の線を跨いだら弾く
          const crossed = (last.y - state.y) * (point.y - state.y) < 0;
          if (crossed && point.x > state.x0 && point.x < state.x1) {
            pluck(state, point.x, Math.sign(dy) * (6 + Math.min(Math.abs(dy) * 0.5, 16)));
          }
        }
      }
      last = point;
    };
    const onLeave = () => {
      last = null;
    };
    // タップ: 最も近い弦を弾く（リンク・ボタンのタップは除外）
    const onDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('a, button')) return;
      const point = toLocal(group, event.clientX, event.clientY);
      if (!point) return;
      let nearest: StringState | null = null;
      let best = TAP_RADIUS;
      for (const state of local) {
        const distance = Math.abs(point.y - state.y);
        if (distance < best) {
          best = distance;
          nearest = state;
        }
      }
      if (nearest) pluck(nearest, point.x, 14);
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
    host.addEventListener('pointerdown', onDown, { passive: true });
    cleanups.push(() => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
    });

    // 開演: 三の糸 → 二の糸 → 一の糸 の順に静かに弾かれる
    if (svg.hasAttribute('data-strings-intro')) {
      const timers = [...local].map((state, index) =>
        window.setTimeout(
          () => pluck(state, 600 + index * 40, 9),
          1400 + index * 180
        )
      );
      cleanups.push(() => timers.forEach((timer) => window.clearTimeout(timer)));
    }
  });

  if (!tickerBound) {
    tickerBound = true;
    gsap.ticker.add(tick);
  }
}

