/**
 * 筆の一円相（えんそう）をビルド時に生成する。
 *
 * 一本の太線ではなく、穂先の「毛」を束ねた複数の細い線（bristle）で描く。
 * - 入り: 筆を置いた瞬間の溜まり（太く・濃い）
 * - 送り: 筆圧の揺らぎで太さと濃さがゆっくり変化し、半径もわずかに揺れる
 * - 抜き: 穂先が紙から離れていき細くなる。外側の毛から先に墨が切れ「かすれ」が出る
 * - 飛沫: 入りの周りにごく小さな墨の飛び
 *
 * 乱数はシード付き（mulberry32）で、同じ入力からは常に同じ形が得られる（ビルドが安定）。
 * 描画アニメーションは「筆の中心線」を stroke-dashoffset で伸ばすマスクで行う（scripts/motion.ts）。
 */

/** 円相の書き始めの角度（度。0 = 3時方向、時計回りが正）。WebGL の粒子の円相と共有する */
export const ENSOU_START_DEG = -32;
/** 筆を運ぶ角度（度）。360 未満で右上に切れ目（余白）が残る */
export const ENSOU_SWEEP_DEG = 334;
/** 半径に対する筆の最大幅 */
export const ENSOU_WEIGHT = 0.12;

export interface BrushOptions {
  cx: number;
  cy: number;
  /** 円相の半径 */
  r: number;
  /** 筆の最大幅（半径に対する比） */
  weight?: number;
  /** 書き始めの角度（度。0 = 3時方向、時計回りが正） */
  startDeg?: number;
  /** 筆を運ぶ角度（度）。360 未満で切れ目（余白）が残る */
  sweepDeg?: number;
  /** 毛の本数 */
  bristles?: number;
  /** 中心線の分割数 */
  steps?: number;
  seed?: number;
}

export interface BrushPath {
  d: string;
  width: number;
  opacity: number;
}

export interface BrushResult {
  bristles: BrushPath[];
  /** 描画用マスクの中心線（筆の軌跡） */
  spine: string;
  /** マスク線の太さ（筆幅に余裕を持たせたもの） */
  spineWidth: number;
  /** 入りの飛沫 */
  dots: { cx: number; cy: number; r: number; opacity: number }[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const fmt = (n: number): string => (Math.round(n * 10) / 10).toString();

export function createEnsou(options: BrushOptions): BrushResult {
  const {
    cx,
    cy,
    r,
    weight = ENSOU_WEIGHT,
    startDeg = ENSOU_START_DEG,
    sweepDeg = ENSOU_SWEEP_DEG,
    bristles = 16,
    steps = 96,
    seed = 7,
  } = options;
  const rand = mulberry32(seed);
  const maxWidth = r * weight;

  // 筆圧と半径の揺らぎ（低周波の正弦を重ねた、手の震えのような変化）
  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;
  const phaseC = rand() * Math.PI * 2;

  /** 筆幅（0〜1 の進行度 u に対して） */
  const widthAt = (u: number): number => {
    const press = 0.72 + 0.28 * smoothstep(0, 0.05, u); // 入りの溜まり
    const flow = 1 + 0.12 * Math.sin(Math.PI * 2 * 1.25 * u + phaseA);
    const fatigue = 1 - 0.32 * u; // 墨が減るにつれ細る
    const release = 1 - 0.88 * smoothstep(0.76, 1, u); // 抜き
    return maxWidth * press * flow * fatigue * release;
  };

  /** 後半で穂先が割れて毛が開く度合い */
  const splayAt = (u: number): number => 1 + 0.8 * smoothstep(0.5, 0.97, u);

  /** 1本の毛の太さ係数（前半は隣と重なって面になり、後半は細く分かれてかすれる） */
  const bristleAt = (u: number): number => 2.3 - 1.65 * smoothstep(0.45, 0.97, u);

  /** 中心線の半径（わずかな楕円と揺らぎ、終わりはわずかに内側へ巻き込む） */
  const radiusAt = (u: number): number =>
    r *
    (1 +
      0.016 * Math.sin(Math.PI * 2 * 0.9 * u + phaseB) +
      0.007 * Math.sin(Math.PI * 2 * 2.6 * u + phaseC) -
      0.03 * u * u);

  const angleAt = (u: number): number => ((startDeg + sweepDeg * u) * Math.PI) / 180;

  const point = (u: number, offset: number): [number, number] => {
    const a = angleAt(u);
    const rr = radiusAt(u) + offset;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.985];
  };

  const result: BrushPath[] = [];
  for (let i = 0; i < bristles; i++) {
    const lane = (i + 0.5) / bristles - 0.5 + (rand() - 0.5) * (0.5 / bristles);
    const edge = Math.abs(lane) * 2; // 0 = 中央, 1 = 縁
    // 入り: 外側の毛ほど遅れて紙に触れる（丸い頭になる）
    const begin = 0.018 * edge * edge + rand() * 0.004;
    // 抜き: 外側の毛から先に墨が切れる
    const end = 1 - edge * (0.1 + rand() * 0.22) - rand() * 0.04;
    const thickness = (0.8 + rand() * 0.45) / bristles;
    const inkiness = 0.55 + rand() * 0.45 - edge * 0.15;

    // かすれ: 後半で毛が一瞬紙から浮く箇所（途切れ）
    const gaps: [number, number][] = [];
    const gapCount = edge > 0.35 ? 1 + Math.floor(rand() * 2) : rand() < 0.4 ? 1 : 0;
    for (let g = 0; g < gapCount; g++) {
      const at = 0.55 + rand() * 0.38;
      gaps.push([at, at + 0.012 + rand() * 0.045]);
    }

    // 途切れで分割した区間ごとに、左右の縁を結んだ細長い面（可変幅）を作る
    const segments: [number, number][] = [];
    let cursor = begin;
    for (const [g0, g1] of gaps.sort((a, b) => a[0] - b[0])) {
      if (g0 > cursor && g0 < end) segments.push([cursor, g0]);
      cursor = Math.max(cursor, g1);
    }
    if (cursor < end) segments.push([cursor, end]);

    let d = '';
    for (const [u0, u1] of segments) {
      const n = Math.max(3, Math.round((steps * (u1 - u0)) / 1));
      const left: string[] = [];
      const right: string[] = [];
      for (let s = 0; s <= n; s++) {
        const u = u0 + ((u1 - u0) * s) / n;
        const w = widthAt(u);
        // 区間の両端は細くすぼめる（毛先の丸み）
        const tip = Math.min(1, (s / n) * 6, ((n - s) / n) * 6);
        const half = (w * thickness * bristleAt(u) * (0.35 + 0.65 * tip)) / 2;
        const center = lane * w * splayAt(u);
        const [lx, ly] = point(u, center - half);
        const [rx, ry] = point(u, center + half);
        left.push(`${fmt(lx)} ${fmt(ly)}`);
        right.push(`${fmt(rx)} ${fmt(ry)}`);
      }
      d += `M${left.join('L')}L${right.reverse().join('L')}Z`;
    }
    result.push({
      d,
      width: 0,
      opacity: Math.round(Math.max(0.28, Math.min(1, inkiness)) * 100) / 100,
    });
  }

  // マスク用の中心線（抜きの先まで）
  let spine = '';
  for (let s = 0; s <= steps; s++) {
    const [x, y] = point(s / steps, 0);
    spine += `${s === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`;
  }

  // 入りの飛沫
  const dots = Array.from({ length: 5 }, () => {
    const u = rand() * 0.06;
    const [x, y] = point(u, (rand() - 0.5) * maxWidth * 2.4);
    return {
      cx: Math.round(x * 10) / 10,
      cy: Math.round(y * 10) / 10,
      r: Math.round((0.6 + rand() * 1.6) * (r / 300) * 10) / 10,
      opacity: Math.round((0.25 + rand() * 0.4) * 100) / 100,
    };
  });

  return { bristles: result, spine, spineWidth: Math.ceil(maxWidth * 2.4), dots };
}
