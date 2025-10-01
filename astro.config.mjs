// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { katexDisplayFix } from './katex-display-fix.mjs';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  markdown: {
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeKatex, {
          output: 'mathml',
          strict: false,
          trust: false,
          throwOnError: false
        }],
        katexDisplayFix
      ],
      shikiConfig: { theme: 'vitesse-light',
        wrap: true,
       }
    },

  vite: {
    plugins: [tailwindcss()]
  },

  site: 'https://soooprmx.com',
  integrations: [sitemap()]
});
