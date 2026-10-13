# Blog Editor

블로그(`src/content`)의 글을 작성·편집하는 로컬 전용 도구. [md-notes](../../../md-notes)(Milkdown Crepe + Svelte 5)를 복사해 블로그용으로 개조했다. Astro 배포물과 무관하며 `127.0.0.1` 에만 바인딩한다.

## 실행

```bash
npm run editor:install   # 최초 1회 (저장소 루트에서)
npm run editor:build     # 프런트 빌드(tools/editor/dist)
npm run editor           # http://127.0.0.1:5180
```

- 편집 루트: `NOTES_ROOT` 환경변수 또는 `node tools/editor/server.js <폴더>`, 기본값은 `src/content`. 포트는 `PORT`/`--port`.
- 개발: `tools/editor` 에서 `NOTES_ROOT=<폴더> npm run dev`(포트 5181), 타입 검사는 `npm run check`.

## 저장 시 본문 보존 (문법 지원과 회귀 검사)

Milkdown 은 저장할 때 본문 전체를 다시 직렬화한다. 그대로 두면 건드리지 않은 줄까지 서식이 바뀌고, 모르는 문법은 깨진다. 그래서 세 겹으로 막는다.

1. **문법 노드** (`src/lib/syntax/`, 구성은 `src/lib/editor-config.ts` 의 `buildEditor`): 블로그가 쓰는 문법을 에디터가 이해한다.
   - 수식 `$..$` / `$$..$$`: Crepe Latex 기능(KaTeX).
   - Obsidian 콜아웃 `> [!type]± 제목`, 컨테이너 디렉티브 `:::name[label]{attrs}`: 전용 노드.
   - 이미지: Crepe 이미지 블록은 `alt` 자리에 비율(`1.00`)을 저장해 alt 가 사라지므로 `imageAlt.ts` 로 `![alt](src "title")` 를 보존하게 교정.
   - 취소선은 `~~A~~` 만 인식(`gfmTilde.ts`).
2. **서식 복원** (`src/lib/style.ts`): 저장할 때 에디터 출력에서 *의미는 같고 서식만 다른 줄*(줄 끝 공백, 목록 표식·번호, 들여쓰기, 빈 줄, 표 정렬, 불필요한 이스케이프, `$$x$$`↔`$x$`, `<url>` 등)을 디스크 원문의 줄로 되돌린다. 되돌린 결과를 다시 mdast 로 파싱해 에디터 출력과 구조가 같을 때만 쓰고, 다르면(예: 목록 중첩을 바꾼 편집) 더 엄격한 수준 → 에디터 출력 순으로 물러난다. 편집한 줄만 git diff 에 남는다. 아무것도 편집하지 않으면 본문은 파일에 쓰이지도 않는다.
3. **회귀 검사** (`npm run roundtrip`, `scripts/roundtrip.mjs`): 실제 글 전체를 jsdom 위의 같은 에디터 구성으로 파싱→직렬화해 다음을 센다. 문법을 추가·변경할 때마다 돌린다.
   - `astPreserved`: 원문과 직렬화 결과의 mdast 구조가 같은지(의미 보존).
   - `styleRestored`: 서식 복원 후 원문과 같은지(편집 없이 저장해도 diff 0).
   - `--edit`: 본문 한 줄만 고쳤을 때 diff 가 그 줄만 남는지(`editMinimalDiff`).
   - `--show <경로 일부>`: 파일별 상세 / `--dump <경로 일부>`: 원문과 에디터 출력 비교. (Git Bash 에서 `/` 로 시작하는 인자는 경로로 변환되니 `blog/` 처럼 쓴다.)
   - `scripts/fixtures/*.md` 는 `--root scripts/fixtures` 로 돌리는 합성 사례.

## 구현 단계

1. 복사·정리 (완료): md-notes 에서 코멘트·버전 이력·docx 내보내기·스탠드얼론·붙여넣기/드롭 제거. 트리·검색·읽기/편집 모드·자동 저장 유지.
2. (완료) frontmatter 속성 패널: 컬렉션별 폼 + YAML 직접 편집 토글, 태그·시리즈 자동완성, slug 중복·날짜 검증, 날짜/시간 피커, 대표 이미지 업로드·미리보기(public/images). 저장 시 modified_date 갱신, 본문 이미지는 글 옆 `<slug>-<번호>.<ext>`. 새 글은 제목+slug 로 만들어 `<slug>.md` 와 기본 frontmatter 생성.
3. (완료) 문법 지원(수식·콜아웃·`:::` directive)·서식 복원·슬래시 메뉴 콜아웃 삽입, 전체 글 라운드트립 회귀 검사.
4. (완료) draft → blog 발행: 글·참조 이미지 이동(다른 draft 가 쓰는 이미지는 복사), `status: published`·`published_date` 갱신. 이동 전에 목록·충돌(같은 이름의 글·slug·이미지)을 보여주고 확인을 받는다. 상단 [발행] 버튼 또는 draft 글 옆 아이콘.
