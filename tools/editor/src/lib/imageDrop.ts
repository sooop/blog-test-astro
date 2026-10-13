// 이미지 파일 드롭: 본문 영역이 아니라 창 어디에 놓아도 업로드해서 본문에 삽입한다.
// ProseMirror 기본 드롭 처리는 편집 영역 안에서만 동작하고, 영역 밖에 놓으면 브라우저가 이미지 파일을 열어 버린다.
//   - 본문 안: 놓은 위치의 블록 바로 뒤에 삽입
//   - 본문 위쪽(속성 패널·상단바 등): 맨 앞 / 본문 아래쪽·사이드바 등 그 밖: 맨 끝
import type { EditorView } from '@milkdown/kit/prose/view';
import type { NodeType } from '@milkdown/kit/prose/model';

export interface ImageDropOptions {
  view: EditorView;
  imageBlock: NodeType; // 단독 이미지 블록 노드 타입
  upload: (file: File) => Promise<string>;
  isReadonly: () => boolean;
  onOver: (over: boolean) => void; // 드래그 중 안내 표시
  onMessage: (text: string, kind: 'info' | 'error') => void;
}

const isFiles = (dt: DataTransfer | null) => !!dt && [...dt.types].includes('Files');
// dragover 중에는 files 가 비어 있고 items 로만 종류를 알 수 있다
const hasImage = (dt: DataTransfer | null) => !!dt && [...dt.items].some((i) => i.kind === 'file' && (i.type === '' || i.type.startsWith('image/')));

// 속성 패널의 대표 이미지 영역·입력칸·대화상자는 자체 처리가 있으므로 건드리지 않는다
const skip = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.('.imgfield, input, textarea, select, .dialog, .cm-editor');

export function attachImageDrop(o: ImageDropOptions): () => void {
  const { view } = o;

  const onOver = (e: DragEvent) => {
    if (!isFiles(e.dataTransfer) || skip(e)) return;
    e.preventDefault(); // 이걸 하지 않으면 drop 이 오지 않고 브라우저가 파일을 연다
    const ok = !o.isReadonly() && hasImage(e.dataTransfer);
    if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? 'copy' : 'none';
    o.onOver(ok);
  };
  const onLeave = (e: DragEvent) => { if (e.relatedTarget === null) o.onOver(false); };

  // 놓은 위치 → 문서 안의 삽입 위치(최상위 블록 경계)
  function insertPos(e: DragEvent): number {
    const rect = view.dom.getBoundingClientRect();
    if (e.clientY < rect.top) return 0;
    if (e.clientY <= rect.bottom && view.dom.contains(e.target as Node)) {
      const hit = view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (hit) {
        const $p = view.state.doc.resolve(hit.pos);
        return $p.depth >= 1 ? $p.after(1) : hit.pos;
      }
    }
    return view.state.doc.content.size;
  }

  const onDrop = async (e: DragEvent) => {
    if (!isFiles(e.dataTransfer) || skip(e)) return;
    e.preventDefault();
    e.stopPropagation(); // ProseMirror 의 기본 드롭 처리와 중복 삽입되지 않게
    o.onOver(false);
    const files = [...(e.dataTransfer?.files ?? [])];
    if (o.isReadonly()) { o.onMessage('읽기 모드에서는 이미지를 넣을 수 없습니다. 편집 모드로 바꿔 주세요', 'error'); return; }
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) { o.onMessage('이미지 파일만 놓을 수 있습니다', 'error'); return; }
    if (images.length < files.length) o.onMessage('이미지가 아닌 파일은 건너뛰었습니다', 'info');

    let pos = insertPos(e);
    for (const file of images) {
      try {
        const src = await o.upload(file);
        pos = Math.min(pos, view.state.doc.content.size); // 업로드 중 문서가 바뀌었을 수 있다
        const node = o.imageBlock.create({ src, caption: '', title: '', ratio: 1 });
        view.dispatch(view.state.tr.insert(pos, node).scrollIntoView());
        pos += node.nodeSize;
      } catch (err) {
        o.onMessage(`이미지 업로드 실패: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    }
  };

  // 캡처 단계에서 받아, 어디에 놓아도 처리한다
  const opts = { capture: true } as const;
  window.addEventListener('dragenter', onOver, opts);
  window.addEventListener('dragover', onOver, opts);
  window.addEventListener('dragleave', onLeave, opts);
  window.addEventListener('drop', onDrop, opts);
  window.addEventListener('dragend', () => o.onOver(false), opts);
  return () => {
    window.removeEventListener('dragenter', onOver, opts);
    window.removeEventListener('dragover', onOver, opts);
    window.removeEventListener('dragleave', onLeave, opts);
    window.removeEventListener('drop', onDrop, opts);
    o.onOver(false);
  };
}
