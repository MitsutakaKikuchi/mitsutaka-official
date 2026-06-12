import { defineCollection, z } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';

/**
 * 公演スケジュールのデータソースは2系統:
 *
 * 1. Google スプレッドシート（推奨・本番運用）
 *    環境変数 SCHEDULE_CSV_URL に「ウェブに公開」した CSV の URL を設定すると有効になる。
 *    シートの1行目は次の日本語ヘッダーにすること（順不同・余分な列は無視される）:
 *    日付, 公演名, 公演名（英語）, 会場, 会場（英語）, 都市, 都市（英語）, 国,
 *    チケットURL, 公演ページURL, 完売, チラシ画像URL, 公演写真URL, ジャンル, 共演者
 *    - 日付 は YYYY-MM-DD 形式
 *    - 完売 は TRUE / FALSE（または 完売）
 *    - チラシ画像URL / 公演写真URL は任意。複数枚ある場合はカンマ区切りで複数URLを指定すると、
 *      サイト上でスライドショー表示になる。https:// の完全URL、またはサイト内パス（例: photos/xxx.jpg）
 *    - 公演ページURL は任意。出演者の特設サイトなどへのリンク
 *    - ジャンル / 共演者 は任意。複数ある場合はカンマ区切りで指定すると、
 *      公演カード上に小さなタグとして表示される（例: 長唄, 舞踊会）
 *
 * 2. Markdown ファイル（フォールバック・ローカル開発用）
 *    SCHEDULE_CSV_URL 未設定時は src/content/schedule/*.md を読む。
 *    フィールド名はシートの英語キー（titleJa, flyerUrls など）と同じ。
 */

/** カンマ区切り文字列をトリム済み配列に変換するスキーマ（空文字は空配列になる） */
const commaListSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(z.string()).default([]));

const scheduleSchema = z.object({
  titleJa: z.string(),
  titleEn: z.string(),
  date: z.coerce.date(),
  venueJa: z.string(),
  venueEn: z.string(),
  cityJa: z.string(),
  cityEn: z.string(),
  /** ISO 3166-1 alpha-2 国コード（JP, US, FR など） */
  country: z.string().length(2).default('JP'),
  ticketUrl: z.string().url().optional(),
  /** 公演ページ・出演者特設サイトなどへのリンク（任意） */
  websiteUrl: z.string().url().optional(),
  soldOut: z.boolean().default(false),
  /** 公演チラシ画像（任意・複数可）。完全URLまたはサイト内パス */
  flyerUrls: commaListSchema,
  /** 演奏時の写真（任意・複数可）。完全URLまたはサイト内パス */
  photoUrls: commaListSchema,
  /** ジャンル（任意・複数可、例: 長唄, 舞踊会） */
  genres: commaListSchema,
  /** 共演者（任意・複数可） */
  performers: commaListSchema,
});

/** ダブルクォート対応の簡易CSVパーサー（タイトル内のカンマ・改行も扱える） */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

/** スプレッドシートの日本語ヘッダー（および旧バージョンの英語ヘッダー）を内部フィールド名に変換 */
const HEADER_ALIASES: Record<string, string> = {
  日付: 'date',
  公演名: 'titleJa',
  '公演名（英語）': 'titleEn',
  会場: 'venueJa',
  '会場（英語）': 'venueEn',
  都市: 'cityJa',
  '都市（英語）': 'cityEn',
  国: 'country',
  チケットURL: 'ticketUrl',
  公演ページURL: 'websiteUrl',
  完売: 'soldOut',
  チラシ画像URL: 'flyerUrls',
  公演写真URL: 'photoUrls',
  ジャンル: 'genres',
  共演者: 'performers',
  // 旧バージョンの英語ヘッダー（互換のため）
  flyerUrl: 'flyerUrls',
  photoUrl: 'photoUrls',
};

/** Google スプレッドシート（CSV公開URL）から公演データを読み込むローダー */
function sheetLoader(csvUrl: string): Loader {
  return {
    name: 'schedule-sheet-loader',
    load: async ({ store, parseData, logger }) => {
      logger.info(`Google スプレッドシートから公演データを取得: ${csvUrl}`);
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(
          `公演データの取得に失敗しました (HTTP ${response.status})。シートの「ウェブに公開」設定と SCHEDULE_CSV_URL を確認してください。`
        );
      }
      const [headerRow, ...records] = parseCsv(await response.text());
      if (!headerRow) {
        logger.warn('シートが空です。公演は0件として扱います。');
        store.clear();
        return;
      }
      const headers = headerRow.map((header) => HEADER_ALIASES[header.trim()] ?? header.trim());

      store.clear();
      for (const record of records) {
        const raw = Object.fromEntries(
          headers.map((header, index) => [header, record[index]?.trim() ?? ''])
        );
        if (!raw.date || !raw.titleJa) continue; // 必須列が無い行はスキップ

        const id = `${raw.date}-${raw.titleJa.replace(/\s+/g, '-')}`;
        const data = await parseData({
          id,
          data: {
            titleJa: raw.titleJa,
            titleEn: raw.titleEn || raw.titleJa,
            date: raw.date,
            venueJa: raw.venueJa,
            venueEn: raw.venueEn || raw.venueJa,
            cityJa: raw.cityJa,
            cityEn: raw.cityEn || raw.cityJa,
            country: raw.country || 'JP',
            ticketUrl: raw.ticketUrl || undefined,
            websiteUrl: raw.websiteUrl || undefined,
            soldOut: /^(true|1|yes|完売)$/i.test(raw.soldOut ?? ''),
            flyerUrls: raw.flyerUrls || '',
            photoUrls: raw.photoUrls || '',
            genres: raw.genres || '',
            performers: raw.performers || '',
          },
        });
        store.set({ id, data });
      }
      logger.info(`公演データ ${store.keys().length} 件を読み込みました`);
    },
  };
}

const scheduleCsvUrl = process.env.SCHEDULE_CSV_URL;

const schedule = defineCollection({
  loader: scheduleCsvUrl
    ? sheetLoader(scheduleCsvUrl)
    : glob({ pattern: '**/*.md', base: './src/content/schedule' }),
  schema: scheduleSchema,
});

export const collections = { schedule };
