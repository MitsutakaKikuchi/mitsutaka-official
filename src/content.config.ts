import { defineCollection, z } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';

/**
 * 公演スケジュールのデータソースは2系統:
 *
 * 1. Google スプレッドシート（推奨・本番運用）
 *    環境変数 SCHEDULE_CSV_URL に「ウェブに公開」した CSV の URL を設定すると有効になる。
 *    シートの1行目は次のヘッダーにすること（順不同・余分な列は無視される）:
 *    date, titleJa, titleEn, venueJa, venueEn, cityJa, cityEn, country, ticketUrl, soldOut, flyerUrl, photoUrl
 *    - date は YYYY-MM-DD 形式
 *    - soldOut は TRUE / FALSE（または 完売）
 *    - flyerUrl / photoUrl は任意。https:// の完全URL、またはサイト内パス（例: photos/xxx.jpg）
 *
 * 2. Markdown ファイル（フォールバック・ローカル開発用）
 *    SCHEDULE_CSV_URL 未設定時は src/content/schedule/*.md を読む。
 */
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
  soldOut: z.boolean().default(false),
  /** 公演チラシ画像（任意）。完全URLまたはサイト内パス */
  flyerUrl: z.string().optional(),
  /** 演奏時の写真（任意）。完全URLまたはサイト内パス */
  photoUrl: z.string().optional(),
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
      const headers = headerRow.map((header) => header.trim());

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
            soldOut: /^(true|1|yes|完売)$/i.test(raw.soldOut ?? ''),
            flyerUrl: raw.flyerUrl || undefined,
            photoUrl: raw.photoUrl || undefined,
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
