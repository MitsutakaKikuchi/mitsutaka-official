# MITSUTAKA 公式ウェブサイト

長唄三味線方 MITSUTAKA の公式サイト。日英2言語対応の静的サイトで、GitHub Pages で公開する。

- フレームワーク: [Astro](https://astro.build/)（静的出力）
- スタイリング: Tailwind CSS v4
- 多言語: `/ja/` `/en/` のURL分割 + hreflang
- 公演データ: Markdown（`src/content/schedule/`）
- フォーム: Formspree（要設定）
- デプロイ: GitHub Actions → GitHub Pages（`main` への push で自動）

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
| GitHubユーザー名（`YOUR-GITHUB-USERNAME` を置換） | `astro.config.mjs` の `site` / `public/robots.txt` |
| Formspree のフォームID（`YOUR_FORM_ID` を置換） | `src/config/site.ts` の `formspreeEndpoint` |
| アーティスト名の正式表記 | `src/config/site.ts` |
| YouTube 動画ID（なければ空配列に） | `src/config/site.ts` の `youtubeVideoIds` |
| プロフィール文・受賞歴（現在は仮テキスト） | `src/pages/[lang]/about.astro` |
| 公演データ（現在はサンプル3件） | `src/content/schedule/*.md` |
| 写真素材（ポートレート・ギャラリー・OGP画像） | `src/pages/[lang]/about.astro` / `media.astro` / `public/ogp.svg` |

## 公演スケジュールの更新方法

`src/content/schedule/` に Markdown ファイルを1公演1ファイルで追加する（GitHub のWeb画面からも編集可能。コミットすると自動で再デプロイされる）。

```markdown
---
titleJa: '長唄演奏会 2026'
titleEn: 'Nagauta Concert 2026'
date: 2026-07-18
venueJa: '紀尾井ホール'
venueEn: 'Kioi Hall'
cityJa: '東京'
cityEn: 'Tokyo'
country: 'JP'                          # ISO 3166-1 国コード
ticketUrl: 'https://example.com/'      # 任意
soldOut: false                         # 完売時は true
---
```

開催日を過ぎた公演は自動的に「過去の公演」アーカイブへ移動する。

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
