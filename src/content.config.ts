import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 公演スケジュール。src/content/schedule/ に Markdown を1公演1ファイルで追加する。
 * ファイル名は「YYYY-MM-DD-slug.md」を推奨（例: 2026-07-18-tokyo-recital.md）
 */
const schedule = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/schedule' }),
  schema: z.object({
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
  }),
});

export const collections = { schedule };
