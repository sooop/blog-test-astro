// 에디터(브라우저)와 라운드트립 검사(Node)가 함께 쓰는 Milkdown 구성.
// 블로그 문법(수식·콜아웃·directive)을 이해시키고, 직렬화 결과를 기존 글의 문체에 맞춘다.
// headless: 문서 구조·직렬화에 영향이 없는 UI 기능(툴바·블록 핸들·코드 에디터 등)을 빼고 만든다(검사용).
import { CrepeBuilder } from '@milkdown/crepe/builder';
import { codeMirror } from '@milkdown/crepe/feature/code-mirror';
import { imageBlock } from '@milkdown/crepe/feature/image-block';
import { latex } from '@milkdown/crepe/feature/latex';
import { listItem } from '@milkdown/crepe/feature/list-item';
import { table } from '@milkdown/crepe/feature/table';
import { onlyDoubleTilde } from './gfmTilde';
import { imageAltSchema } from './syntax/imageAlt';
import { codeLanguages, codeHighlight } from './codeLanguages';
import { calloutPlugins, addCalloutMenuItem } from './syntax/callout';
import { directivePlugins } from './syntax/directive';

export interface BuildOptions {
  root: HTMLElement;
  defaultValue: string;
  headless?: boolean;
  upload?: (file: File) => Promise<string>;
  resolveUrl?: (src: string) => string | Promise<string>;
}

export async function buildEditor(o: BuildOptions): Promise<CrepeBuilder> {
  const upload = o.upload ?? (async () => { throw new Error('업로드를 지원하지 않습니다'); });
  const c = new CrepeBuilder({ root: o.root, defaultValue: o.defaultValue })
    .addFeature(listItem)
    .addFeature(table)
    .addFeature(codeMirror, o.headless ? { languages: [] } : { languages: codeLanguages, theme: codeHighlight }) // Latex 가 CodeMirror 를 전제로 한다
    .addFeature(latex)
    .addFeature(imageBlock, {
      onUpload: upload,
      blockOnUpload: upload,
      inlineOnUpload: upload,
      proxyDomURL: o.resolveUrl,
    });

  if (!o.headless) {
    // 편집 UI 기능은 브라우저에서만 쓴다
    const [{ cursor }, { linkTooltip }, { blockEdit }, { toolbar }, { placeholder }] =
      await Promise.all([
        import('@milkdown/crepe/feature/cursor'),
        import('@milkdown/crepe/feature/link-tooltip'),
        import('@milkdown/crepe/feature/block-edit'),
        import('@milkdown/crepe/feature/toolbar'),
        import('@milkdown/crepe/feature/placeholder'),
      ]);
    c.addFeature(cursor)
      .addFeature(linkTooltip)
      .addFeature(blockEdit, { buildMenu: addCalloutMenuItem }) // 슬래시(/) 메뉴에 '콜아웃' 항목 추가
      .addFeature(toolbar)
      .addFeature(placeholder, { text: '내용을 입력하세요. / 를 누르면 블록 메뉴가 열립니다.' });
  }

  c.editor.use(imageAltSchema).use(directivePlugins).use(calloutPlugins); // 블로그 문법 노드 (src/lib/syntax)
  onlyDoubleTilde(c.editor); // 취소선은 ~~A~~ 만 인식하고 글자 그대로의 ~ 는 보존한다
  return c;
}
