/**
 * 光の三本弦（components/Strings.astro）のインタラクション。
 * - ポインタが弦を横切ると、その位置・速さに応じて弦が弾かれ、減衰振動しながら光る
 * - タップ／クリックでも近くの弦が弾かれる（スクロール中のタッチ端末向け）
 * - [data-string-dot] の HUD インジケーターが対応する弦と同期して灯る
 * - [data-sound-toggle] で音を ON にすると、Web Audio（Karplus-Strong 法）で
 *   本調子に調弦した三味線風の撥音を合成して鳴らす（既定は OFF・ユーザー操作でのみ有効化）
 * すべて prefers-reduced-motion を尊重し、無効時は何もしない（静止した光の線のまま）。
 */
import gsap from 'gsap';

interface StringState {
  el: SVGPathElement;
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

/* 本調子（一の糸 B2 / 二の糸 E3 / 三の糸 B3）。一と三がオクターブ、二が四度上 */
const PITCH_HZ: Record<string, number> = { '1': 123.47, '2': 164.81, '3': 246.94 };

let states: StringState[] = [];
let tickerBound = false;
let cleanups: (() => void)[] = [];

/* ---------- 音（Karplus-Strong 撥弦合成）---------- */
let audioCtx: AudioContext | null = null;
let soundOn = false;
const bufferCache = new Map<string, AudioBuffer>();

function getPluckBuffer(ctx: AudioContext, id: string): AudioBuffer {
  const cached = bufferCache.get(id);
  if (cached) return cached;
  const freq = PITCH_HZ[id] ?? 164.81;
  const duration = 2.2;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const period = Math.max(2, Math.round(ctx.sampleRate / freq));
  const ring = new Float32Array(period);
  // 撥で叩く鋭いアタック: ノイズを明るめに
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  const decay = 0.996;
  for (let i = 0; i < length; i++) {
    const next = (idx + 1) % period;
    const value = ring[idx] ?? 0;
    // 平均化（ローパス）+ 減衰
    ring[idx] = decay * 0.5 * (value + (ring[next] ?? 0));
    // 「さわり」風の僅かなビリつき（ソフトクリップ）
    data[i] = Math.tanh(value * 1.8) * 0.55;
    idx = next;
  }
  bufferCache.set(id, buffer);
  return buffer;
}

function playPluck(id: string, strength: number): void {
  if (!soundOn || !audioCtx) return;
  const source = audioCtx.createBufferSource();
  source.buffer = getPluckBuffer(audioCtx, id);
  const gain = audioCtx.createGain();
  gain.gain.value = Math.min(0.5, 0.15 + strength * 0.02);
  source.connect(gain).connect(audioCtx.destination);
  source.start();
}

function setSound(on: boolean): void {
  soundOn = on;
  if (on) {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        soundOn = false;
        return;
      }
      audioCtx = new Ctor();
    }
    void audioCtx.resume();
  }
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((button) => {
    button.setAttribute('aria-pressed', String(soundOn));
    const label = button.querySelector<HTMLElement>('[data-sound-label]');
    if (label) label.textContent = soundOn ? button.dataset.labelOn ?? 'ON' : button.dataset.labelOff ?? 'OFF';
  });
}

/* ---------- 弦の振動 ---------- */
function drawString(state: StringState, displacement: number): void {
  // 二次ベジェの制御点を弾いた位置に置く（頂点の変位は制御点の約半分になるため 2 倍）
  state.el.setAttribute(
    'd',
    `M${state.x0} ${state.y} Q${state.px.toFixed(1)} ${(state.y + displacement * 2).toFixed(2)} ${state.x1} ${state.y}`
  );
}

function lightDot(host: HTMLElement, id: string): void {
  host.querySelectorAll<HTMLElement>(`[data-string-dot][data-dot="${id}"]`).forEach((dot) => {
    dot.classList.add('is-lit');
    window.setTimeout(() => dot.classList.remove('is-lit'), 180);
  });
}

function pluck(state: StringState, x: number, amp: number): void {
  // 振動中の弦を弱く撫でただけでは弾き直さない（連続発火で音が濁るのを防ぐ）
  const now = performance.now();
  if (state.active && now - state.t0 < 90) return;
  state.px = gsap.utils.clamp(state.x0 + 200, state.x1 - 200, x);
  state.amp = gsap.utils.clamp(-MAX_AMP, MAX_AMP, amp);
  state.t0 = now;
  state.active = true;
  state.el.classList.add('is-plucked');
  window.setTimeout(() => state.el.classList.remove('is-plucked'), 160);
  lightDot(state.host, state.id);
  playPluck(state.id, Math.abs(amp));
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

  // 音のトグルは reduced-motion でも使えるようにする（視覚演出とは独立）
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((button) => {
    const onClick = () => setSound(!soundOn);
    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  });
  setSound(soundOn);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll<SVGSVGElement>('svg[data-strings]').forEach((svg) => {
    const group = svg.querySelector<SVGGElement>('g');
    const host = svg.closest<HTMLElement>('[data-strings-host]') ?? svg.parentElement;
    if (!group || !host) return;

    const local: StringState[] = Array.from(
      svg.querySelectorAll<SVGPathElement>('[data-string]')
    ).map((el) => {
      const id = el.dataset.string ?? '2';
      return {
        el,
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
        window.setTimeout(() => pluck(state, 600 + index * 40, 9), 1400 + index * 180)
      );
      cleanups.push(() => timers.forEach((timer) => window.clearTimeout(timer)));
    }
  });

  if (!tickerBound) {
    tickerBound = true;
    gsap.ticker.add(tick);
  }
}
