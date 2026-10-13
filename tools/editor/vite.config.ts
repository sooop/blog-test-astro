import { defineConfig, loadEnv, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { createApi } from './server/api.js';

// 개발 서버(vite)에 파일 API 를 얹는다. 루트는 NOTES_ROOT 또는 블로그의 src/content.
function notesApi(env: Record<string, string>): Plugin {
  return {
    name: 'notes-api',
    configureServer(server) {
      const api = createApi(env.NOTES_ROOT || resolve(process.cwd(), '../../src/content'), { publicDir: resolve(process.cwd(), '../../public') });
      server.middlewares.use((req, res, next) => {
        api(req, res).then((handled) => { if (!handled) next(); }, next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [svelte(), notesApi(env)],
    build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
    server: { port: 5181, host: '127.0.0.1' },
  };
});
