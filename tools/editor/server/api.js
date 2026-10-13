// 파일 API: 루트 폴더 안의 .md 문서와 assets 이미지를 다룬다. 외부 의존성 없음.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { parse as parseYaml } from 'yaml';
import { buildMatcher } from './searchCore.js';
import { createPublisher } from './publish.js';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp']);
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.bmp': 'image/bmp',
};
const MAX_JSON = 20 * 1024 * 1024;
const MAX_UPLOAD = 50 * 1024 * 1024;
const SKIP_DIRS = new Set(['node_modules', 'assets']);
const SEARCH = { perFile: 50, total: 500, maxBytes: 2 * 1024 * 1024, timeoutMs: 8000 };
const SEARCH_WORKER = fileURLToPath(new URL('./searchWorker.js', import.meta.url));

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// opts.publicDir: 사이트의 public 폴더. 대표 이미지(og:image)는 사이트 루트 URL(/images/...)로 접근돼야 하므로 여기에 저장한다.
export function createApi(rootInput, opts = {}) {
  const root = path.resolve(rootInput);
  const publicDir = opts.publicDir ? path.resolve(opts.publicDir) : null;
  const FEATURE_SUBDIR = 'images';

  // 루트 기준 상대경로(슬래시)를 절대경로로 변환한다. symlink 를 해석해 루트 밖이면 거부한다.
  async function safe(relPath, { mustExist = true } = {}) {
    if (typeof relPath !== 'string' || relPath.includes('\0')) throw new HttpError(400, '잘못된 경로');
    const abs = path.resolve(root, relPath);
    const realRoot = await fs.realpath(root);
    let real;
    try {
      real = await fs.realpath(abs);
    } catch {
      if (mustExist) throw new HttpError(404, '없는 경로');
      // 아직 없는 대상은 존재하는 가장 가까운 상위 폴더를 해석한 뒤 나머지를 이어 붙여 검사
      let cur = abs;
      const tail = [];
      for (;;) {
        const up = path.dirname(cur);
        tail.unshift(path.basename(cur));
        if (up === cur) break;
        cur = up;
        try { cur = await fs.realpath(cur); break; } catch { /* 계속 위로 */ }
      }
      real = path.join(cur, ...tail.slice(1));
    }
    if (!(real === realRoot || real.startsWith(realRoot + path.sep))) {
      throw new HttpError(403, '루트 밖 경로는 허용되지 않음');
    }
    return abs;
  }

  const rel = (abs) => path.relative(root, abs).split(path.sep).join('/');
  const isMd = (p) => p.toLowerCase().endsWith('.md');
  const docAssetsDir = (docAbs) =>
    path.join(path.dirname(docAbs), 'assets', path.basename(docAbs, path.extname(docAbs)));

  async function readBody(req, limit) {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > limit) throw new HttpError(413, '본문이 너무 큼');
      chunks.push(c);
    }
    return Buffer.concat(chunks);
  }
  const readJson = async (req) => {
    const buf = await readBody(req, MAX_JSON);
    try { return JSON.parse(buf.toString('utf8') || '{}'); }
    catch { throw new HttpError(400, 'JSON 형식 오류'); }
  };

  async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

  async function buildTree(dirAbs) {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    const out = [];
    for (const e of entries) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const abs = path.join(dirAbs, e.name);
      if (e.isDirectory()) {
        out.push({ name: e.name, path: rel(abs), type: 'dir', children: await buildTree(abs) });
      } else if (e.isFile() && isMd(e.name)) {
        out.push({ name: e.name, path: rel(abs), type: 'file' });
      }
    }
    out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'ko') : a.type === 'dir' ? -1 : 1));
    return out;
  }

  // 검색 대상 .md 파일 목록 (트리와 같은 제외 규칙, 심볼릭 링크는 따라가지 않는다)
  async function listMd(dirAbs, out = []) {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const abs = path.join(dirAbs, e.name);
      if (e.isDirectory()) await listMd(abs, out);
      else if (e.isFile() && isMd(e.name)) out.push({ path: rel(abs), abs });
    }
    return out;
  }

  // 정규식이 오래 걸리면 워커를 끊는다
  function runSearch(req, files, query, opts) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(SEARCH_WORKER, {
        workerData: { files, query, opts, perFile: SEARCH.perFile, total: SEARCH.total, maxBytes: SEARCH.maxBytes },
      });
      const timer = setTimeout(() => {
        void worker.terminate();
        reject(new HttpError(422, '검색 시간이 초과되었습니다. 검색어(정규식)를 단순하게 바꿔 보세요'));
      }, SEARCH.timeoutMs);
      // 클라이언트가 요청을 취소하면(검색어를 계속 고치는 중) 워커도 바로 끊는다
      req.once('client-abort', () => { clearTimeout(timer); void worker.terminate(); reject(new HttpError(499, '검색이 취소되었습니다')); });
      worker.once('message', (m) => { clearTimeout(timer); resolve(m); });
      worker.once('error', (e) => { clearTimeout(timer); reject(e); });
    });
  }

  const publisher = createPublisher({ root, safe, rel, exists, listMd, HttpError });

  const routes = {
    'GET /api/info': async () => ({ root: path.basename(root) || root }),

    // 폼 자동완성·slug 중복 검사용: 전체 문서의 frontmatter 요약
    'GET /api/meta': async () => {
      const files = await listMd(root);
      const docs = [];
      await Promise.all(files.map(async (f) => {
        try {
          const text = await fs.readFile(f.abs, 'utf8');
          const m = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---/.exec(text);
          if (!m) return;
          const d = parseYaml(m[1]);
          if (!d || typeof d !== 'object') return;
          const str = (v) => (typeof v === 'string' ? v : undefined);
          docs.push({
            path: f.path,
            slug: str(d.slug),
            series: str(d.series),
            tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
          });
        } catch { /* frontmatter 가 깨진 문서는 건너뜀 */ }
      }));
      docs.sort((a, b) => a.path.localeCompare(b.path, 'ko'));
      return { docs };
    },

    'GET /api/tree': async () => ({ children: await buildTree(root) }),

    // 본문 검색: q=검색어, cs=1 대소문자 구분, re=1 정규식
    'GET /api/search': async (req, q) => {
      const query = q.get('q') ?? '';
      const opts = { caseSensitive: q.get('cs') === '1', regex: q.get('re') === '1' };
      const { error } = buildMatcher(query, opts);
      if (error) throw new HttpError(400, error);
      const files = (await listMd(root)).sort((a, b) => a.path.localeCompare(b.path, 'ko'));
      return runSearch(req, files, query, opts);
    },

    'GET /api/file': async (_req, q) => {
      const abs = await safe(q.get('path'));
      if (!isMd(abs)) throw new HttpError(400, '.md 파일만 허용');
      const [content, st] = await Promise.all([fs.readFile(abs, 'utf8'), fs.stat(abs)]);
      return { content, mtime: st.mtimeMs };
    },

    'PUT /api/file': async (req, q) => {
      const abs = await safe(q.get('path'), { mustExist: false });
      if (!isMd(abs)) throw new HttpError(400, '.md 파일만 허용');
      const { content } = await readJson(req);
      if (typeof content !== 'string') throw new HttpError(400, 'content 필요');
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, 'utf8');
      return { mtime: (await fs.stat(abs)).mtimeMs };
    },

    'POST /api/create': async (req) => {
      const { path: p, type } = await readJson(req);
      const abs = await safe(p, { mustExist: false });
      if (await exists(abs)) throw new HttpError(409, '이미 존재함');
      if (type === 'dir') {
        await fs.mkdir(abs, { recursive: true });
      } else {
        if (!isMd(abs)) throw new HttpError(400, '.md 파일만 허용');
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, '', 'utf8');
      }
      return { path: rel(abs) };
    },

    // draft → blog 발행. plan: 옮길 파일·충돌을 계산만 한다 / publish: 확인 후 실제로 옮기고 content 를 blog 에 쓴다.
    'POST /api/publish/plan': async (req) => {
      const { path: p, content } = await readJson(req);
      return publisher.plan(p, content);
    },
    'POST /api/publish': async (req) => {
      const { path: p, content } = await readJson(req);
      return publisher.run(p, content);
    },

    // 이름 변경/이동. 문서면 assets/<문서명> 폴더를 함께 옮기고 본문 링크를 갱신한다.
    'POST /api/rename': async (req) => {
      const { from, to } = await readJson(req);
      const src = await safe(from);
      const dst = await safe(to, { mustExist: false });
      if (await exists(dst)) throw new HttpError(409, '대상이 이미 존재함');
      const st = await fs.stat(src);
      if (st.isFile() && !(isMd(src) && isMd(dst))) throw new HttpError(400, '.md 파일만 허용');
      await fs.mkdir(path.dirname(dst), { recursive: true });
      const oldAssets = st.isFile() ? docAssetsDir(src) : null;
      await fs.rename(src, dst);
      if (oldAssets && (await exists(oldAssets))) {
        const newAssets = docAssetsDir(dst);
        await fs.mkdir(path.dirname(newAssets), { recursive: true });
        await fs.rename(oldAssets, newAssets);
        const oldPrefix = `assets/${encodeURIComponent(path.basename(oldAssets))}/`;
        const newPrefix = `assets/${encodeURIComponent(path.basename(newAssets))}/`;
        if (oldPrefix !== newPrefix) {
          const text = await fs.readFile(dst, 'utf8');
          await fs.writeFile(dst, text.split(oldPrefix).join(newPrefix), 'utf8');
        }
      }
      return { path: rel(dst) };
    },

    'DELETE /api/file': async (_req, q) => {
      const abs = await safe(q.get('path'));
      if (abs === root) throw new HttpError(400, '루트는 삭제할 수 없음');
      const st = await fs.stat(abs);
      if (st.isDirectory()) {
        await fs.rm(abs, { recursive: true });
      } else {
        if (!isMd(abs)) throw new HttpError(400, '.md 파일만 허용');
        await fs.rm(abs);
        await fs.rm(docAssetsDir(abs), { recursive: true, force: true });
      }
      return { ok: true };
    },

    // 대표 이미지 업로드: <public>/images/<name>-feature-<번호>.<ext> 로 저장하고 사이트 루트 URL(/images/...)을 돌려준다.
    // 본문 이미지와 달리 글 옆이 아니라 public 에 둔다 (og:image 는 사이트 URL 로 접근돼야 하고 Astro 가 가공하지 않는다).
    'POST /api/feature-image': async (req, q) => {
      if (!publicDir) throw new HttpError(500, 'public 폴더가 설정되지 않음');
      const ext = '.' + String(q.get('ext') || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (!IMAGE_EXT.has(ext) || ext === '.svg') throw new HttpError(400, '허용되지 않는 이미지 형식');
      const base = String(q.get('name') || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
      const body = await readBody(req, MAX_UPLOAD);
      const dir = path.join(publicDir, FEATURE_SUBDIR);
      await fs.mkdir(dir, { recursive: true });
      const re = new RegExp('^' + base + '-feature-(\\d+)\\.[a-z0-9]+$', 'i');
      let max = 0;
      for (const n of await fs.readdir(dir)) { const m = re.exec(n); if (m) max = Math.max(max, Number(m[1])); }
      const name = base + '-feature-' + (max + 1) + ext;
      await fs.writeFile(path.join(dir, name), body, { flag: 'wx' });
      return { url: '/' + FEATURE_SUBDIR + '/' + encodeURIComponent(name) };
    },

    // 이미지 업로드: 본문은 원본 바이너리, doc=문서경로, ext=확장자, name=파일명 접두(보통 slug).
    // 글과 같은 폴더에 <name>-<번호>.<ext> 로 저장하고 상대 링크를 돌려준다.
    'POST /api/upload': async (req, q) => {
      const docAbs = await safe(q.get('doc'));
      if (!isMd(docAbs)) throw new HttpError(400, '.md 문서만 가능');
      const ext = '.' + String(q.get('ext') || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (!IMAGE_EXT.has(ext)) throw new HttpError(400, '허용되지 않는 이미지 형식');
      const base = (String(q.get('name') || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''))
        || path.basename(docAbs, path.extname(docAbs)).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
        || 'image';
      const body = await readBody(req, MAX_UPLOAD);
      const dir = path.dirname(docAbs);
      // 같은 접두의 가장 큰 번호 + 1 (지운 번호를 재사용하지 않는다)
      const re = new RegExp('^' + base + '-(\\d+)\\.[a-z0-9]+$', 'i');
      let max = 0;
      for (const n of await fs.readdir(dir)) { const m = re.exec(n); if (m) max = Math.max(max, Number(m[1])); }
      const name = `${base}-${max + 1}${ext}`;
      await fs.writeFile(path.join(dir, name), body, { flag: 'wx' });
      return { url: encodeURIComponent(name) };
    },
  };

  async function raw(res, q) {
    return sendImage(res, await safe(q.get('path')));
  }

  // public 폴더의 이미지(대표 이미지 미리보기용). public 밖으로 나가는 경로는 symlink 해석 후 거부한다.
  async function publicRaw(res, q) {
    if (!publicDir) throw new HttpError(404, 'public 폴더가 설정되지 않음');
    const relPath = q.get('path');
    if (typeof relPath !== 'string' || relPath.includes('\0')) throw new HttpError(400, '잘못된 경로');
    const abs = path.resolve(publicDir, relPath);
    let real, realBase;
    try { [real, realBase] = await Promise.all([fs.realpath(abs), fs.realpath(publicDir)]); }
    catch { throw new HttpError(404, '없는 파일'); }
    if (!real.startsWith(realBase + path.sep)) throw new HttpError(403, 'public 밖 경로는 허용되지 않음');
    return sendImage(res, abs);
  }

  async function sendImage(res, abs) {
    const ext = path.extname(abs).toLowerCase();
    if (!IMAGE_EXT.has(ext)) throw new HttpError(400, '이미지만 허용');
    const data = await fs.readFile(abs);
    res.writeHead(200, {
      'Content-Type': MIME[ext],
      'Content-Length': data.length,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    });
    res.end(data);
  }

  // 처리했으면 true, 아니면 false(다음 핸들러로)
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return false;
    try {
      // 다른 출처 페이지가 보내는 요청 차단
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, '허용되지 않는 출처');
      if (req.method === 'GET' && url.pathname === '/api/raw') { await raw(res, url.searchParams); return true; }
      if (req.method === 'GET' && url.pathname === '/api/public') { await publicRaw(res, url.searchParams); return true; }
      res.once('close', () => { if (!res.writableEnded) req.emit('client-abort'); });
      const fn = routes[`${req.method} ${url.pathname}`];
      if (!fn) throw new HttpError(404, '없는 API');
      const data = await fn(req, url.searchParams);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (!(e instanceof HttpError)) console.error(e);
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  };
}
