/**
 * クッキー同意 + Google Analytics 4 の読込制御。
 * - 同意状態は localStorage（`mk-consent`）に保存する: 'granted' | 'denied'
 * - 測定IDが未設定（SITE.ga4MeasurementId が空）の間はバナーも解析も一切出さない
 * - 同意前は gtag の consent mode を denied で初期化し、同意後にのみ gtag.js を読み込む
 * - 「同意しない」を選んだ場合はスクリプトを読み込まない（クッキーも発行されない）
 * Astro View Transitions を跨いでも二重読込しないよう、読込済みフラグを持つ。
 */
const STORAGE_KEY = 'mk-consent';
const STORAGE_VERSION = 'v1';

type Consent = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let gaLoaded = false;

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const [version, value] = raw.split(':');
    if (version !== STORAGE_VERSION) return null;
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Consent): void {
  try {
    localStorage.setItem(STORAGE_KEY, `${STORAGE_VERSION}:${value}`);
  } catch {
    /* プライベートモード等で保存できない場合は同意をセッション内のみ有効にする */
  }
}

function loadAnalytics(measurementId: string): void {
  if (gaLoaded) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  window.gtag('js', new Date());
  // View Transitions ではページ遷移ごとに手動で page_view を送るため自動送信を切る
  window.gtag('config', measurementId, { send_page_view: false, anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  trackPageView();
}

function trackPageView(): void {
  if (!gaLoaded || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: location.href,
    page_path: location.pathname,
  });
}

/** クッキーバナーの表示・ボタン結線（ページ遷移ごとに呼ぶ） */
function bindBanner(measurementId: string): void {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const show = () => {
    banner.hidden = false;
    // 次フレームでクラスを付け、CSS トランジションでせり上げる
    requestAnimationFrame(() => banner.classList.add('is-visible'));
  };
  const hide = () => {
    banner.classList.remove('is-visible');
    window.setTimeout(() => {
      banner.hidden = true;
    }, 450);
  };

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => {
    writeConsent('granted');
    hide();
    loadAnalytics(measurementId);
  });
  banner.querySelector('[data-consent-decline]')?.addEventListener('click', () => {
    writeConsent('denied');
    hide();
  });

  // フッターの「クッキー設定」から再表示できる
  document.querySelectorAll<HTMLElement>('[data-consent-open]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      show();
    });
  });

  if (readConsent() === null) {
    // 初回訪問: ファーストビューの演出を邪魔しないよう少し遅らせて出す
    window.setTimeout(show, 1400);
  }
}

export function initConsent(measurementId: string): void {
  if (!measurementId) return;
  bindBanner(measurementId);
  if (readConsent() === 'granted') {
    if (gaLoaded) {
      trackPageView();
    } else {
      loadAnalytics(measurementId);
    }
  }
}
