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
  /** 読み（構造化データの別名。読みで検索された場合にも結び付くように） */
  artistNameKana: 'きくち みつたか',
  /** 雅号など、本名以外の名義（構造化データの別名）。プロフィール本文と一致させること */
  stageNames: ['若柳歓峰', 'Wakayagi Yoshitaka'],
  titleJa: '菊池光峰 | 長唄三味線方 公式サイト',
  titleEn: 'KIKUCHI Mitsutaka | Nagauta Shamisen Player — Official Website',
  descriptionJa:
    '歌舞伎とともに歩んできた長唄の伝統を受け継ぐ長唄三味線方・菊池光峰の公式サイト。国内外での演奏活動、プロフィール、公演スケジュール、コンサート・式典・メディアへの出演依頼の受付はこちら。',
  /** 構造化データ（Person）用の人物紹介。サイトの説明ではなく人物の説明にする（プロフィール本文と一致させること） */
  personDescriptionJa:
    '東京都出身の長唄三味線方。幼少より日本舞踊を学び、若柳流にて若柳歓峰の名を許される。長唄三味線を成田涼子氏に師事し、演奏会・舞踊会への出演や学校での和楽器指導に取り組む。東京藝術大学音楽学部邦楽科在学中。',
  personDescriptionEn:
    'Nagauta shamisen player from Tokyo. Trained in classical Japanese dance from childhood and granted the name Wakayagi Yoshitaka in the Wakayagi school, he studies nagauta shamisen under Narita Ryoko, performs in concerts and dance recitals, and teaches traditional instruments in schools. Currently studying at Tokyo University of the Arts.',
  descriptionEn:
    'Official website of KIKUCHI Mitsutaka, a nagauta shamisen player carrying on a tradition that developed alongside kabuki. Profile, upcoming performances, and booking inquiries for concerts, ceremonies, and media appearances worldwide.',
  /**
   * 問い合わせフォーム送信先（Formspree）。
   * TODO: https://formspree.io でフォームを作成し、発行された ID に置き換える
   */
  formspreeEndpoint: 'https://formspree.io/f/xqeoloab',
  /**
   * Google Search Console の所有権確認コード（HTMLタグ方式）。
   * Search Console で「HTMLタグ」確認を選ぶと表示される
   * <meta name="google-site-verification" content="ここの値"> の content 部分だけを貼る。
   * 空のままなら何も出力されない。
   */
  googleSiteVerification: 'l3yrr9hNZM2NmFxoKAwH6HRRAgJG7MdlObm6ahZu21o',
  /**
   * Google Analytics 4 の測定ID（例: 'G-XXXXXXXXXX'）。
   * 空文字の間は解析タグを一切読み込まない。値を入れると、クッキーバナーで
   * 訪問者が「同意する」を選んだ場合にのみ gtag.js を読み込む（GDPR / 改正電気通信事業法配慮）。
   */
  ga4MeasurementId: '',
  /** プライバシーポリシー・利用規約の最終改定日（ISO 形式）。改定時にここを更新する */
  legalUpdatedAt: '2026-09-13',
  /** OGP 画像（public/ 配下）。1200×630px */
  ogImage: 'ogp.jpg',
  /** SNS は Instagram のみ運用。追加する場合はここに URL を足し、Footer.astro に項目を追加する */
  sns: {
    instagram: 'https://www.instagram.com/_mitsu_yoshi_taka/',
  },
  /** Media ページに表示する YouTube 動画 ID（https://youtu.be/XXXX の XXXX 部分）。
   *  空配列の間は動画セクション自体が非表示になる。動画を追加するにはここに ID を足す */
  youtubeVideoIds: [] as string[],
} as const;
