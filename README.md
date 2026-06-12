# 菊池光峰（KIKUCHI Mitsutaka）公式ウェブサイト

長唄三味線方・菊池光峰の公式サイト。日英2言語対応の静的サイトで、GitHub Pages で公開する。

- フレームワーク: [Astro](https://astro.build/)（静的出力）
- スタイリング: Tailwind CSS v4
- 多言語: `/ja/` `/en/` のURL分割 + hreflang
- 公演データ: Markdown（`src/content/schedule/`）
- フォーム: Formspree
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
  - すべて `prefers-reduced-motion` 対応（無効時は静的表示）

> **注意**: CSS の `scroll-behavior: smooth` は ScrollTrigger と干渉してページが勝手にスクロールする不具合を起こすため使用しないこと（詳細は `src/styles/global.css` のコメント参照）。

## 開発コマンド

```bash
npm install        # 依存パッケージのインストール
npm run dev        # 開発サーバー起動（http://localhost:4321/mitsutaka-official/）
npm run build      # 本番ビルド（dist/ に出力）
npm run preview    # ビルド結果の確認
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

設定済み: GitHubユーザー名（MitsutakaKikuchi）／Formspree ID／アーティスト名／プロフィール文／写真（`src/assets/photos/`）／OGP画像（`public/ogp.jpg`）

## 公演スケジュールの更新方法（Google スプレッドシート）

普段の更新は**スプレッドシートに1行追加するだけ**。サイトには毎朝6時に自動反映される（すぐ反映したい場合は GitHub の Actions タブ → Deploy to GitHub Pages → Run workflow）。

### 初回セットアップ（1回だけ）

1. Google スプレッドシートを新規作成し、1行目に次のヘッダー（日本語）を入れる

   ```
   日付 | 公演名 | 公演名（英語） | 会場 | 会場（英語） | 都市 | 都市（英語） | 国 | チケットURL | 公演ページURL | 完売 | チラシ画像URL | 公演写真URL | ジャンル | 共演者
   ```

2. メニューの **ファイル → 共有 → ウェブに公開** で、対象シートを **カンマ区切り形式（.csv）** で公開し、URLをコピー
3. GitHub リポジトリの **Settings → Secrets and variables → Actions → Variables** で
   `SCHEDULE_CSV_URL` という名前の変数を作成し、コピーしたURLを貼り付ける
   - この変数は GitHub Actions の build 時に参照される

### 入力ルール

| 列 | 内容 |
|----|------|
| `日付` | `2026-07-18` の形式（必須） |
| `公演名` / `公演名（英語）` | 公演名。英語名が空なら日本語名を流用（公演名は必須） |
| `会場` 〜 `都市（英語）` | 会場・都市名（日英） |
| `国` | 国コード2文字（`JP` `FR` など。空なら `JP`） |
| `チケットURL` | チケットページURL（任意） |
| `公演ページURL` | 出演者特設サイトなど公演の詳細ページへのリンク（任意） |
| `完売` | 完売なら `TRUE` |
| `チラシ画像URL` | チラシ画像（任意）。画像URLを貼る |
| `公演写真URL` | 演奏時の写真（任意）。画像URLを貼る |
| `ジャンル` | 公演のジャンル（任意）。例: `長唄` `舞踊会` |
| `共演者` | 共演者名（任意） |

- チラシ・写真が無い公演は空欄でOK（テキストのみで表示される）
- チラシ・写真は**複数指定可**。`チラシ画像URL` `公演写真URL` の欄に **カンマ区切り** で複数のURLを入力すると、サイト上で数秒ごとに自動でスライド表示される
- `ジャンル` `共演者` は**複数指定可**。**カンマ区切り**で入力すると、公演カードに小さなタグとして表示される（例: `長唄, 舞踊会`）
- 開催日を過ぎた公演は自動的に「過去の公演」アーカイブへ移動する
- 画像はリポジトリの `public/flyers/` `public/photos/` にアップロードして `flyers/xxx.jpg` のようにパス指定するか、外部の画像URLをそのまま貼る
- チラシ・写真をタップ（クリック）すると、ポップアップ（ライトボックス）で拡大表示される

### フォールバック（Markdown）

`SCHEDULE_CSV_URL` 未設定の間は `src/content/schedule/*.md`（1公演1ファイル）が使われる。ローカル開発やシート障害時の代替手段。フィールドはシートの列と同じ。

## 独自ドメインへの移行（将来）

1. `astro.config.mjs` の `site` をドメインに変更し、`base` を `'/'` にする
2. `public/robots.txt` の Sitemap URL を変更する
3. GitHub Pages の Custom domain 設定（または任意のホスティングへ `dist/` を配置）

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
