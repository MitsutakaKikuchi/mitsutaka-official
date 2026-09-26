/**
 * 構造化データ（JSON-LD）の共通部品。
 * 人物（Person）を @id で一意に識別し、各ページの WebSite / ProfilePage / MusicEvent から
 * 同じ人物として参照させる（検索エンジンがサイト全体を一人の演奏家の情報として結び付けやすくなる）。
 */
import { SITE } from '../config/site';
import { withBase } from '../i18n/utils';
import type { Lang } from '../i18n/ui';

/** サイトのルート URL（言語に依らない） */
export function siteRootUrl(site: URL | undefined): string {
  return new URL(withBase('/'), site).href;
}

/** 人物の一意な ID（全ページ・全言語で共通） */
export function personId(site: URL | undefined): string {
  return `${siteRootUrl(site)}#person`;
}

export function websiteId(site: URL | undefined): string {
  return `${siteRootUrl(site)}#website`;
}

/**
 * 人物の構造化データ。
 * 本名・雅号・読み・ローマ字表記を alternateName にまとめ、どの表記で検索されても結び付くようにする。
 */
export function buildPerson(lang: Lang, site: URL | undefined, imageUrl: string) {
  const isJa = lang === 'ja';
  return {
    '@type': 'Person',
    '@id': personId(site),
    name: isJa ? SITE.artistNameJa : SITE.artistNameEn,
    alternateName: [
      isJa ? SITE.artistNameEn : SITE.artistNameJa,
      'Mitsutaka Kikuchi',
      SITE.artistNameKana,
      ...SITE.stageNames,
    ],
    familyName: isJa ? '菊池' : 'Kikuchi',
    givenName: isJa ? '光峰' : 'Mitsutaka',
    jobTitle: isJa ? '長唄三味線' : 'Nagauta Shamisen Player',
    hasOccupation: {
      '@type': 'Occupation',
      name: isJa ? '長唄三味線' : 'Nagauta shamisen player',
    },
    description: isJa ? SITE.personDescriptionJa : SITE.personDescriptionEn,
    url: siteRootUrl(site),
    image: imageUrl,
    nationality: { '@type': 'Country', name: isJa ? '日本' : 'Japan' },
    affiliation: {
      '@type': 'CollegeOrUniversity',
      name: isJa ? '東京藝術大学' : 'Tokyo University of the Arts',
      url: 'https://www.geidai.ac.jp/',
    },
    knowsAbout: isJa
      ? ['長唄', '三味線', '長唄三味線', '歌舞伎音楽', '日本舞踊', '邦楽', '日本の伝統音楽']
      : [
          'Nagauta',
          'Shamisen',
          'Nagauta shamisen',
          'Kabuki music',
          'Nihon buyo',
          'Hogaku',
          'Japanese traditional music',
        ],
    sameAs: Object.values(SITE.sns).filter(Boolean),
  };
}
