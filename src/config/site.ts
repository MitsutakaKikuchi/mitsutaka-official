/**
 * サイト全体の設定。アーティスト情報の変更はこのファイル1箇所で完結する。
 */
export const SITE = {
  // TODO: 日本語の正式表記（漢字等）が決まったら artistNameJa を変更する
  artistNameJa: 'MITSUTAKA',
  artistNameEn: 'MITSUTAKA',
  /** 縦書きロゴ・ヒーローで使う和文表記（仮: 決定後に変更） */
  artistNameVertical: 'みつたか',
  titleJa: 'MITSUTAKA | 長唄三味線方 公式サイト',
  titleEn: 'MITSUTAKA | Nagauta Shamisen Player — Official Website',
  descriptionJa:
    '長唄三味線方 MITSUTAKA の公式ウェブサイト。プロフィール、公演スケジュール、出演依頼の受付はこちら。',
  descriptionEn:
    'Official website of MITSUTAKA, Nagauta shamisen player. Profile, performance schedule, and booking inquiries.',
  /**
   * 問い合わせフォーム送信先（Formspree）。
   * TODO: https://formspree.io でフォームを作成し、発行された ID に置き換える
   */
  formspreeEndpoint: 'https://formspree.io/f/xqeoloab',
  /** SNS は Instagram のみ運用。追加する場合はここに URL を足し、Footer.astro に項目を追加する */
  sns: {
    instagram: 'https://www.instagram.com/_mitsu_yoshi_taka/',
  },
  /** TODO: Media ページに表示する YouTube 動画 ID（https://youtu.be/XXXX の XXXX 部分）。動画がない場合は空配列に */
  youtubeVideoIds: ['dQw4w9WgXcQ'],
} as const;
