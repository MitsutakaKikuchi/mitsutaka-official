/**
 * 公演画像の URL 解決（EventCard の表示と、構造化データ MusicEvent.image で共用）。
 */
import { withBase } from '../i18n/utils';

// Google ドライブの共有リンク（/open?id=, /file/d/<id>/view, /uc?...id=）から
// ファイルIDを取り出すパターン。これらのURLはビューア用ページを返すため <img> では表示できない
const GOOGLE_DRIVE_URL_PATTERN = /drive\.google\.com\/(?:open\?id=|file\/d\/|uc\?[^#]*id=)([\w-]+)/;

/**
 * 完全URLはそのまま、サイト内パスは base を付与する。
 * Google ドライブの共有リンクは、画像として直接表示できる形式に変換する
 */
export function resolveImageUrl(url: string): string {
  const driveMatch = url.match(GOOGLE_DRIVE_URL_PATTERN);
  if (driveMatch) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w1600`;
  }
  return /^https?:\/\//.test(url) ? url : withBase(url);
}
