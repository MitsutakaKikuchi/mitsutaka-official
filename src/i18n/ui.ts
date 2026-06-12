export const LANGUAGES = {
  ja: '日本語',
  en: 'English',
} as const;

export type Lang = keyof typeof LANGUAGES;

export const DEFAULT_LANG: Lang = 'ja';

export const ui = {
  ja: {
    'nav.home': 'ホーム',
    'nav.about': 'プロフィール',
    'nav.schedule': 'スケジュール',
    'nav.media': 'メディア',
    'nav.contact': 'お問い合わせ',
    'nav.booking': '出演依頼',
    'hero.catchcopy': '伝統を弾き、いまを鳴らす。',
    'hero.sub': '長唄三味線方',
    'hero.scroll': 'スクロール',
    'home.aboutTitle': 'プロフィール',
    'home.aboutLead':
      '歌舞伎とともに歩んできた長唄の伝統を受け継ぎ、国内外の舞台でその音色の可能性を伝える。',
    'home.aboutMore': 'プロフィールを見る',
    'home.scheduleTitle': '出演情報',
    'home.scheduleMore': 'すべての出演を見る',
    'home.noUpcoming': '現在予定されている出演はありません。',
    'home.bookingTitle': '出演のご依頼',
    'home.bookingLead':
      'コンサート・フェスティバル・式典・メディア出演など、国内外を問わずご相談を承ります。',
    'home.bookingCta': '出演を依頼する',
    'schedule.upcoming': '今後の出演',
    'schedule.past': '過去の出演',
    'schedule.tickets': 'チケット',
    'schedule.soldOut': '完売',
    'schedule.flyer': 'チラシ',
    'schedule.photo': '演奏写真',
    'schedule.website': '詳細ページ',
    'lightbox.close': '閉じる',
    'lightbox.prev': '前の画像',
    'lightbox.next': '次の画像',
    'lightbox.label': '画像プレビュー',
    'media.videos': '動画',
    'media.gallery': 'フォトギャラリー',
    'contact.lead':
      '出演依頼・取材・その他のお問い合わせは下記フォームよりお送りください。通常2〜3営業日以内にご返信いたします。',
    'contact.type': 'お問い合わせ種別',
    'contact.typeBooking': '出演・ブッキング依頼',
    'contact.typeGeneral': '一般のお問い合わせ',
    'contact.typePress': '取材・メディア',
    'contact.name': 'お名前',
    'contact.email': 'メールアドレス',
    'contact.org': '団体・会社名（任意）',
    'contact.message': 'お問い合わせ内容',
    'contact.messagePlaceholder':
      '出演依頼の場合は、開催日・会場・国/都市・内容の概要をご記載ください。',
    'contact.submit': '送信する',
    'contact.note':
      '※ フォームが利用できない場合は SNS の DM よりご連絡ください。',
    'footer.copyright': 'All Rights Reserved.',
    '404.title': 'ページが見つかりません',
    '404.lead': 'お探しのページは移動または削除された可能性があります。',
    '404.back': 'ホームへ戻る',
  },
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.schedule': 'Schedule',
    'nav.media': 'Media',
    'nav.contact': 'Contact',
    'nav.booking': 'Booking',
    'hero.catchcopy': 'Plucking tradition, sounding the present.',
    'hero.sub': 'Nagauta Shamisen Player',
    'hero.scroll': 'Scroll',
    'home.aboutTitle': 'About',
    'home.aboutLead':
      'Carrying on the nagauta tradition that has evolved alongside kabuki, sharing the voice of the shamisen on stages in Japan and abroad.',
    'home.aboutMore': 'Read full profile',
    'home.scheduleTitle': 'Upcoming Shows',
    'home.scheduleMore': 'View all shows',
    'home.noUpcoming': 'No upcoming shows at the moment.',
    'home.bookingTitle': 'Booking',
    'home.bookingLead':
      'Available for concerts, festivals, ceremonies, and media appearances worldwide.',
    'home.bookingCta': 'Request a booking',
    'schedule.upcoming': 'Upcoming',
    'schedule.past': 'Past Shows',
    'schedule.tickets': 'Tickets',
    'schedule.soldOut': 'Sold Out',
    'schedule.flyer': 'Concert flyer',
    'schedule.photo': 'Concert photo',
    'schedule.website': 'Event page',
    'lightbox.close': 'Close',
    'lightbox.prev': 'Previous image',
    'lightbox.next': 'Next image',
    'lightbox.label': 'Image preview',
    'media.videos': 'Videos',
    'media.gallery': 'Photo Gallery',
    'contact.lead':
      'For booking requests, press inquiries, or any other questions, please use the form below. We usually reply within 2–3 business days.',
    'contact.type': 'Inquiry type',
    'contact.typeBooking': 'Booking request',
    'contact.typeGeneral': 'General inquiry',
    'contact.typePress': 'Press / Media',
    'contact.name': 'Name',
    'contact.email': 'Email',
    'contact.org': 'Organization (optional)',
    'contact.message': 'Message',
    'contact.messagePlaceholder':
      'For booking requests, please include the date, venue, city/country, and an outline of the event.',
    'contact.submit': 'Send',
    'contact.note':
      'If the form is unavailable, please reach out via DM on social media.',
    'footer.copyright': 'All Rights Reserved.',
    '404.title': 'Page Not Found',
    '404.lead': 'The page you are looking for may have been moved or deleted.',
    '404.back': 'Back to Home',
  },
} as const;

export type UiKey = keyof (typeof ui)['ja'];

/** 指定言語の翻訳関数を返す */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key];
  };
}
