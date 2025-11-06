// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkObsidianCallout from './src/plugins/remark-obsidian-callout.ts';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  markdown: {
      remarkPlugins: [remarkMath, remarkObsidianCallout],
      rehypePlugins: [
        [rehypeKatex, {
		  output: "html",
          strict: false,
          trust: false,
          throwOnError: false
        }],
      ],
      shikiConfig: { theme: 'vitesse-light',
        wrap: true,
       }
    },

  vite: {
    plugins: [tailwindcss()]
  },

  site: 'https://soooprmx.com',

  integrations: [sitemap()],
});
