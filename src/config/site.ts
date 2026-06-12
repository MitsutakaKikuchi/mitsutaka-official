/**
 * サイト全体の設定。アーティスト情報の変更はこのファイル1箇所で完結する。
 */
export const SITE = {
  artistNameJa: '菊池光峰',
  artistNameEn: 'KIKUCHI Mitsutaka',
  /** ヘッダー・ヒーローで使う欧文大文字表記 */
  artistNameDisplay: 'KIKUCHI MITSUTAKA',
  /** 縦書きロゴ・ヒーローで使う和文表記 */
  artistNameVertical: '菊池光峰',
  titleJa: '菊池光峰 | 長唄三味線方 公式サイト',
  titleEn: 'KIKUCHI Mitsutaka | Nagauta Shamisen Player — Official Website',
  descriptionJa:
    '長唄三味線方・菊池光峰の公式ウェブサイト。プロフィール、公演スケジュール、出演依頼の受付はこちら。',
  descriptionEn:
    'Official website of KIKUCHI Mitsutaka, Nagauta shamisen player. Profile, performance schedule, and booking inquiries.',
  /**
   * 問い合わせフォーム送信先（Formspree）。
   * TODO: https://formspree.io でフォームを作成し、発行された ID に置き換える
   */
  formspreeEndpoint: 'https://formspree.io/f/xqeoloab',
  /** SNS は Instagram のみ運用。追加する場合はここに URL を足し、Footer.astro に項目を追加する */
  sns: {
    instagram: 'https://www.instagram.com/_mitsu_yoshi_taka/',
  },
  /** Media ページに表示する YouTube 動画 ID（https://youtu.be/XXXX の XXXX 部分）。
   *  空配列の間は動画セクション自体が非表示になる。動画を追加するにはここに ID を足す */
  youtubeVideoIds: [] as string[],
} as const;
