// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// TODO: GitHub Pages 公開時に「YOUR-GITHUB-USERNAME」を実際のユーザー名に変更すること
// 独自ドメイン移行時は site をドメインに変更し base を '/' にする
export default defineConfig({
  site: 'https://mitsutakakikuchi.github.io',
  base: '/mitsutaka-official',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en'],
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ja',
        locales: {
          ja: 'ja',
          en: 'en',
        },
      },
      // ルートは言語振り分け用の noindex ページのため sitemap から除外
      filter: (page) => page !== 'https://mitsutakakikuchi.github.io/mitsutaka-official/',
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
