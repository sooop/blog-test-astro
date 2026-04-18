// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkObsidianCallout from './src/plugins/remark-obsidian-callout.ts';
import remarkDirective from 'remark-directive';
import remarkCalloutDirective from './src/plugins/remark-callout-directive.ts';
import remarkKbd from './src/plugins/remark-kbd.ts';
import remarkNoUnderscoreEmphasis from './src/plugins/remark-no-underscore-emphasis.ts';
import rehypeCodeBlockWrap from './src/plugins/rehype-code-block-wrap.ts';
import rehypeTableWrap from './src/plugins/rehype-table-wrap.ts';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';

export default defineConfig({
  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkObsidianCallout,
      remarkDirective,
      remarkCalloutDirective,
      remarkKbd,
      remarkNoUnderscoreEmphasis,
    ],
    rehypePlugins: [
      [rehypeKatex, {
        output: 'html',
        strict: false,
        trust: false,
        throwOnError: false,
      }],
      rehypeCodeBlockWrap,
      rehypeTableWrap,
    ],
    shikiConfig: {
      themes: {
        light: 'one-light',
        dark: 'one-dark-pro',
      },
      defaultColor: false,
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  site: 'https://soooprmx.com',

  integrations: [
    sitemap(),
    icon({ iconDir: 'src/icons' }),
    svelte(),
    mdx(),
  ],
});
