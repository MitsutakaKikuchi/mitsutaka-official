import type { Lang } from './ui';

/** base パス（GitHub Pages のサブディレクトリ）を考慮したサイト内パスを生成する */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

/** 言語プレフィックス付きのサイト内パスを生成する（subpath は 'about/' のような形式） */
export function localePath(lang: Lang, subpath = ''): string {
  return withBase(`${lang}/${subpath}`);
}

/** 公演日付を言語に応じた表記でフォーマットする */
export function formatEventDate(date: Date, lang: Lang): string {
  if (lang === 'ja') {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}
