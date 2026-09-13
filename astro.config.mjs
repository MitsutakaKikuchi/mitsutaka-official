// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
      // ルート（言語振り分け用の noindex ページ）と、送信完了ページ（noindex）は sitemap から除外
      filter: (page) =>
        page !== 'https://mitsutakakikuchi.github.io/mitsutaka-official/' &&
        !/\/(ja|en)\/thanks\/?$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
