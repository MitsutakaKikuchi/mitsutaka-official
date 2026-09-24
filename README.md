# 菊池光峰（KIKUCHI Mitsutaka）公式ウェブサイト

長唄三味線方・菊池光峰の公式サイト。日英2言語対応の静的サイトで、GitHub Pages で公開する。

- フレームワーク: [Astro](https://astro.build/)（静的出力）
- スタイリング: Tailwind CSS v4
- 多言語: `/ja/` `/en/` のURL分割 + hreflang
- 公演データ: Markdown（`src/content/schedule/`）
- フォーム: Formspree（JS 有効時は fetch 送信 → `/thanks/` へ遷移。送信中・入力エラー・通信エラーの状態表示付き）
- 法務ページ: プライバシーポリシー `/privacy/`・利用規約 `/terms/`（日英）
- アクセス解析: Google Analytics 4（`src/config/site.ts` の `ga4MeasurementId` を設定すると、クッキーバナーで同意した訪問者にのみ読込）
- デプロイ: GitHub Actions → GitHub Pages（`main` への push で自動）
- タイポグラフィ: フルードサイズ（`clamp()`）+ ディスプレイ書体（Italiana / Yuji Syuku 筆文字）
- モーション演出:
  - Lenis（慣性スクロール）
  - GSAP + ScrollTrigger（スクロール連動フェード／パララックス／マスク+ズームリビール／キネティックタイポ（ブラー付き）／SVGドローイング）
  - マグネティックボタン（CTA がカーソルに吸い付く）
  - Three.js（ヒーローのWebGLパーティクル。ホームのみ動的読込）
  - Astro View Transitions（シームレスなページ遷移）
  - カスタムカーソル（バニラJS）／フィルムグレイン（SVGノイズ）
  - 公演チラシ・写真のスライドショー表示／ライトボックス（タップで拡大表示）
  - 落款リップル（ヒーローをタップすると朱の印が捺されるように波紋が広がる）
  - 傾きパララックス（対応スマホで額装写真が端末の傾きに合わせて揺れる）
  - ページ遷移の墨ワイプ（View Transitions のカスタムアニメーション）＋読み込みインジケーター
  - スマホ用スティッキー CTA（ファーストビューを過ぎると下部に「出演情報／出演依頼」が現れる）
  - 昼夜ハイブリッド（2026-09）: ヒーロー・各ページ冒頭（`PageHero`）・出演依頼・フッターを「夜の舞台」、本文を「昼の和紙」で構成。ヘッダーは下にある地に合わせて自動で昼夜が切り替わる
  - 光の三本弦（`Strings.astro` + `src/scripts/strings.ts`）: 三味線の一〜三の糸を光の線で描き、ポインタで横切る／タップすると弾かれて振動・発光
  - HUD 風の等幅メタ情報（IBM Plex Mono）・四隅ブラケットの額装・直近公演の「あと○日」カウントダウン
  - 操作性: 現在地表示付きナビ、パンくず、スケジュールの区分ジャンプ、メディア写真の拡大表示（← → キー／スワイプ）、規約ページの目次、お問い合わせ種別のタイル選択（`?type=press` で事前選択）、トップへ戻る、モバイルメニューの Esc／フォーカス循環
  - すべて `prefers-reduced-motion` 対応（無効時は静的表示）

> **注意**: CSS の `scroll-behavior: smooth` は ScrollTrigger と干渉してページが勝手にスクロールする不具合を起こすため使用しないこと（詳細は `src/styles/global.css` のコメント参照）。

## 開発コマンド

```bash
npm install        # 依存パッケージのインストール
npm run dev        # 開発サーバー起動（http://localhost:4321/mitsutaka-official/）
npm run build      # 本番ビルド（dist/ に出力）
npm run preview    # ビルド結果の確認
npm run icons      # public/favicon.svg から favicon.ico / apple-touch-icon / PWA アイコンを再生成
npm run images     # src/assets/photos, public/photos, public/flyers の画像を圧縮（追加したら実行）
```

## GitHub Pages 公開手順

1. GitHub で `mitsutaka-official` という**公開リポジトリ**を作成する
2. ローカルからプッシュする

   ```bash
   git remote add origin https://github.com/＜ユーザー名＞/mitsutaka-official.git
   git push -u origin main
   ```

3. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に変更する
4. 以後、`main` へ push するたびに自動でビルド・公開される
   - 公開URL: `https://＜ユーザー名＞.github.io/mitsutaka-official/`

## 公開前に必ず設定するもの（TODO）

| 項目 | 場所 |
|------|------|
| YouTube 動画ID（現在はダミー。なければ空配列に） | `src/config/site.ts` の `youtubeVideoIds` |
| 公演データ（現在はサンプル3件） | `src/content/schedule/*.md` |
| 英語プロフィール内の人名ローマ字表記（若柳宏晃・若柳歓峰）の確認 | `src/pages/[lang]/about.astro` |
| GA4 測定ID（`G-XXXXXXXXXX`。空の間は解析もクッキーバナーも出ない） | `src/config/site.ts` の `ga4MeasurementId` |
| 規約の最終改定日（内容を変えたら更新） | `src/config/site.ts` の `legalUpdatedAt` |

設定済み: GitHubユーザー名（MitsutakaKikuchi）／Formspree ID／アーティスト名／プロフィール文／写真（`src/assets/photos/`）／OGP画像（`public/ogp.jpg`）

## 公演スケジュールの更新方法（Google スプレッドシート）

普段の更新は**スプレッドシートに1行追加するだけ**。サイトには毎朝6時に自動反映される（すぐ反映したい場合は GitHub の Actions タブ → Deploy to GitHub Pages → Run workflow）。

### 初回セットアップ（1回だけ）

1. Google スプレッドシートを新規作成し、1行目に次のヘッダー（日本語）を入れる

   ```
   出演日付 | 公演名 | 公演名（英語） | 会場 | 会場（英語） | 都市 | 都市（英語） | 国 | チケットURL | 公演ページURL | 完売 | チラシ画像 | 公演写真 | ジャンル | 共演者 | 備考
   ```

2. メニューの **ファイル → 共有 → ウェブに公開** で、対象シートを **カンマ区切り形式（.csv）** で公開し、URLをコピー
3. GitHub リポジトリの **Settings → Secrets and variables → Actions → Variables** で
   `SCHEDULE_CSV_URL` という名前の変数を作成し、コピーしたURLを貼り付ける
   - この変数は GitHub Actions の build 時に参照される

### 入力ルール

| 列 | 内容 |
|----|------|
| `出演日付` | `2026-07-18` または `2026/07/18` の形式（必須） |
| `公演名` / `公演名（英語）` | 公演名。英語名が空なら日本語名を流用（公演名は必須） |
| `会場` 〜 `都市（英語）` | 会場・都市名（日英） |
| `国` | 国コード2文字（`JP` `FR` など。空なら `JP`） |
| `チケットURL` | チケットページURL（任意） |
| `公演ページURL` | 出演者特設サイトなど公演の詳細ページへのリンク（任意） |
| `完売` | 完売なら `TRUE` |
| `チラシ画像` | チラシ画像（任意）。画像URLを貼る |
| `公演写真` | 演奏時の写真（任意）。画像URLを貼る |
| `ジャンル` | 公演のジャンル（任意）。例: `長唄` `舞踊会` |
| `共演者` | 共演者名（任意） |
| `備考` | 公演カードに注記として表示（任意）。例: `関係者限定` |

- チラシ・写真が無い公演は空欄でOK（テキストのみで表示される）
- チラシ・写真は**複数指定可**。`チラシ画像` `公演写真` の欄に **カンマ区切り** で複数のURLを入力すると、サイト上で数秒ごとに自動でスライド表示される
- `ジャンル` `共演者` は**複数指定可**。**カンマ区切り**で入力すると、公演カードに小さなタグとして表示される（例: `長唄, 舞踊会`）
- 開催日を過ぎた公演は自動的に「過去の公演」アーカイブへ移動する
- 画像はリポジトリの `public/flyers/` `public/photos/` にアップロードして `flyers/xxx.jpg` のようにパス指定するか、外部の画像URLをそのまま貼る
- **Googleドライブの画像も使用可**。共有設定を「リンクを知っている人全員（閲覧者）」にした上で、共有リンク（`https://drive.google.com/open?id=xxxx` や `.../file/d/xxxx/view`）をそのまま貼ればOK。サイト側で表示用URLに自動変換される
- チラシ・写真をタップ（クリック）すると、ポップアップ（ライトボックス）で拡大表示される

### フォールバック（Markdown）

`SCHEDULE_CSV_URL` 未設定の間は `src/content/schedule/*.md`（1公演1ファイル）が使われる。ローカル開発やシート障害時の代替手段。フィールドはシートの列と同じ。

## 独自ドメインへの移行（将来）

1. `astro.config.mjs` の `site` をドメインに変更し、`base` を `'/'` にする
2. `public/robots.txt` の Sitemap URL を変更する
3. GitHub Pages の Custom domain 設定（または任意のホスティングへ `dist/` を配置）

## SEO・法務・UX まわりの実装メモ

| 項目 | 実装 |
|------|------|
| メタタイトル／メタ記述 | 各ページから `Base.astro` に `title` / `description` を渡す。文言は `src/i18n/ui.ts` の `meta.*` |
| OGP / Twitter Card | `public/ogp.jpg`（1200×630）。`Base.astro` が width/height/alt 付きで出力 |
| ファビコン | `public/favicon.svg` が原本。`npm run icons` で `.ico` / apple-touch-icon / `site.webmanifest` 用 PNG を生成 |
| robots.txt / sitemap | `public/robots.txt`、`@astrojs/sitemap`（ルートと `/thanks/` は除外） |
| 404 | `src/pages/404.astro`（GitHub Pages が全パスで返すため日英併記） |
| ありがとうページ | `/ja/thanks/` `/en/thanks/`（noindex） |
| クッキーバナー | `src/components/CookieBanner.astro` + `src/scripts/consent.ts`。同意は localStorage `mk-consent` に保存。フッターの「クッキー設定」で再表示 |
| フォームの状態 | `src/pages/[lang]/contact.astro` 内のスクリプト（必須・メール形式の検証、送信中スピナー、サーバー／通信エラー表示、ハニーポット） |
| 画像の alt | 写真ごとに日英の説明文を付与（`media.astro` の `altJa` / `altEn` 等） |
| 画像圧縮 | `npm run images`。`public/` 配下は Astro の最適化対象外のため、追加時は必ず実行する |

## ディレクトリ構成

```
src/
├── config/site.ts        # サイト全体の設定（名前・SNS・フォームID）
├── i18n/                  # 翻訳辞書・URLヘルパー
├── content/schedule/      # 公演データ（Markdown）
├── layouts/Base.astro     # 共通レイアウト（SEO・OGP・構造化データ）
├── components/            # ヘッダー・フッター・公演カード等
├── pages/[lang]/          # 日英共通のページテンプレート
└── styles/global.css      # デザイントークン（色・フォント）
```
