// draft → blog 발행(server/publish.js) 검사: 임시 폴더에서 이동·복사·충돌·되돌리기를 확인한다.
//   npm run test:publish
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApi } from '../server/api.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-'));
const root = path.join(tmp, 'content');
const w = (rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const has = (rel) => fs.existsSync(path.join(root, rel));
const fm = (slug, extra = '') => `---\ntitle: T\nslug: ${slug}\nstatus: published\npublished_date: 2026-10-12T00:00:00.000Z\n${extra}---\n\n`;

w('blog/existing.md', fm('existing'));
w('draft/a.md', fm('a') + '![한글 이미지](Pasted%20image%201.png)\n\n![공유](shared.png)\n\n![외부](https://x.com/a.png)\n\n![없음](missing.png)\n');
w('draft/b.md', fm('b') + '![공유](shared.png)\n');
w('draft/dup-slug.md', fm('existing'));
w('draft/same-name.md', fm('same-name'));
w('blog/same-name.md', fm('other'));
w('draft/img-clash.md', fm('img-clash') + '![](clash.png)\n');
fs.writeFileSync(path.join(root, 'draft/Pasted image 1.png'), 'P1');
fs.writeFileSync(path.join(root, 'draft/shared.png'), 'SH');
fs.writeFileSync(path.join(root, 'draft/clash.png'), 'CL');
fs.writeFileSync(path.join(root, 'blog/clash.png'), 'OLD');

const api = createApi(root, { publicDir: path.join(tmp, 'public') });
const srv = http.createServer(async (req, res) => { if (!(await api(req, res))) res.writeHead(404).end(); }).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const post = (u, body) => fetch(base + u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => [r.status, await r.json()]);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : '\n     ' + detail}`); if (!ok) failed++; };

// 1) plan: 이미지 분류
{
  const [st, p] = await post('/api/publish/plan', { path: 'draft/a.md', content: read('draft/a.md') });
  check('plan 200, 이동 대상 blog/a.md', st === 200 && p.to === 'blog/a.md', JSON.stringify(p));
  check('한글·공백 이미지는 move', p.images.some((i) => i.from === 'draft/Pasted image 1.png' && i.action === 'move'), JSON.stringify(p.images));
  check('다른 draft 가 쓰는 이미지는 copy', p.images.some((i) => i.from === 'draft/shared.png' && i.action === 'copy'), JSON.stringify(p.images));
  check('외부 URL 은 대상 아님', !p.images.some((i) => i.from.includes('x.com')));
  check('없는 이미지는 경고', p.warnings.some((x) => x.includes('missing.png')), JSON.stringify(p.warnings));
  check('plan 은 파일을 건드리지 않는다', has('draft/a.md') && !has('blog/a.md'));
}

// 2) 충돌 차단
for (const [name, p, needle] of [
  ['같은 이름의 글', 'draft/same-name.md', '같은 이름의 글'],
  ['같은 slug', 'draft/dup-slug.md', '같은 slug'],
  ['같은 이름의 이미지', 'draft/img-clash.md', '같은 이름의 이미지'],
]) {
  const [st, r] = await post('/api/publish', { path: p, content: read(p) });
  check(`충돌 차단: ${name} → 409`, st === 409 && String(r.error).includes(needle), `${st} ${JSON.stringify(r)}`);
  check(`  차단 후 원본 그대로: ${name}`, has(p));
}
check('이미지 충돌 시 기존 blog/clash.png 보존', read('blog/clash.png') === 'OLD' && has('draft/clash.png'));

// 3) 실제 발행
{
  const content = read('draft/a.md').replace('status: published', 'status: published').replace('title: T', 'title: 발행됨');
  const [st, r] = await post('/api/publish', { path: 'draft/a.md', content });
  check('발행 200', st === 200 && r.path === 'blog/a.md', JSON.stringify(r));
  check('글이 blog 로 이동(draft 에서 사라짐)', has('blog/a.md') && !has('draft/a.md'));
  check('전달한 내용이 그대로 기록', read('blog/a.md') === content);
  check('이미지 move: draft 에서 사라지고 blog 에 있음', !has('draft/Pasted image 1.png') && read('blog/Pasted image 1.png') === 'P1');
  check('공유 이미지 copy: 양쪽에 존재', read('draft/shared.png') === 'SH' && read('blog/shared.png') === 'SH');
}

// 4) draft 밖 / 잘못된 요청
{
  const [s1] = await post('/api/publish/plan', { path: 'blog/existing.md', content: read('blog/existing.md') });
  check('draft 가 아닌 글은 400', s1 === 400);
  const [s2] = await post('/api/publish/plan', { path: '../x.md', content: '' });
  check('경로 이탈은 거부', s2 >= 400);
}

srv.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);
