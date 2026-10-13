<script lang="ts">
  import { untrack } from 'svelte';
  import type { CrepeBuilder } from '@milkdown/crepe/builder';
  import { editorViewCtx } from '@milkdown/kit/core';
  import { imageBlockSchema } from '@milkdown/kit/component/image-block';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import { editorBridge, doc, toast } from '../store.svelte';
  import { attachFinder } from '../search/pmSearch';
  import { finder } from '../search/state.svelte';
  import { buildEditor } from '../editor-config';
  import { attachImageDrop } from '../imageDrop';
  import ImageLightbox, { type LightboxItem } from './ImageLightbox.svelte';

  interface Props {
    initial: string;
    onChange: (md: string) => void;
    upload: (file: File) => Promise<string>;
    resolveUrl: (src: string) => string | Promise<string>;
    readonly?: boolean; // 읽기 모드 (바뀌면 에디터를 다시 만들지 않고 편집 가능 여부만 바꾼다)
  }
  let { initial, onChange, upload, resolveUrl, readonly = false }: Props = $props();

  let host: HTMLDivElement;
  let builder: CrepeBuilder | undefined;
  let ready = $state(false);
  let dragging = $state(false); // 이미지 파일을 끌고 있는 중

  $effect(() => {
    const ro = readonly;
    if (ready) builder?.setReadonly(ro);
  });

  // ---- 이미지 상세 보기 ----
  let lightbox = $state<{ items: LightboxItem[]; index: number } | null>(null);
  let zoomBtn = $state<{ x: number; y: number } | null>(null); // 이미지 위에 마우스를 올리면 나타나는 확대 버튼
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  // 이벤트 대상 → 이미지. 이미지 블록은 <img> 위에 조작용 레이어(.image-wrapper 등)가 덮여 있어 대상이 img 가 아닐 수 있다.
  const imageOf = (t: EventTarget | null): HTMLImageElement | null => {
    if (!(t instanceof Element) || !t.closest('.ProseMirror')) return null;
    const img = t instanceof HTMLImageElement ? t : t.closest('.image-wrapper, .milkdown-image-block')?.querySelector('img');
    return img instanceof HTMLImageElement && img.naturalWidth !== 1 ? img : null;
  };

  function openLightbox(img: HTMLImageElement) {
    const imgs = [...host.querySelectorAll<HTMLImageElement>('.ProseMirror img')];
    lightbox = {
      items: imgs.map((i) => ({ src: i.currentSrc || i.src, alt: i.alt })),
      index: Math.max(0, imgs.indexOf(img)),
    };
    zoomBtn = null;
  }

  let hoverImg: HTMLImageElement | null = null;
  function onOver(e: MouseEvent) {
    const img = imageOf(e.target);
    if (img) {
      clearTimeout(hideTimer);
      hoverImg = img;
      const r = img.getBoundingClientRect();
      zoomBtn = { x: Math.min(r.right, window.innerWidth) - 44, y: Math.max(r.top, 0) + 8 };
    } else if (!(e.target as HTMLElement | null)?.closest?.('.zoom-btn')) {
      hideTimer = setTimeout(() => { zoomBtn = null; hoverImg = null; }, 250);
    }
  }
  const onDblClick = (e: MouseEvent) => { const img = imageOf(e.target); if (img) { e.preventDefault(); openLightbox(img); } };
  const hideZoom = () => { zoomBtn = null; };

  // 문서가 바뀌면 부모가 {#key} 로 이 컴포넌트를 새로 만든다. 여기서는 한 번만 생성한다.
  // 에디터 구성(기능·블로그 문법 노드·직렬화 보정)은 editor-config.ts 에 있고, 라운드트립 검사 스크립트와 공유한다.
  $effect(() => {
    let crepe: CrepeBuilder | undefined;
    let ctl: ReturnType<typeof attachFinder> | undefined;
    let detachDrop: (() => void) | undefined;
    let disposed = false;
    untrack(() => {
      void buildEditor({ root: host, defaultValue: initial, upload, resolveUrl }).then((c) => {
        if (disposed) return;
        if (readonly) c.setReadonly(true);
        c.on((l) => l.markdownUpdated((_ctx, md, prev) => { if (md !== prev) onChange(md); }));
        return c.create().then(() => {
          if (disposed) { void c.destroy(); return; }
          crepe = c;
          builder = c;
          ready = true;
          editorBridge.getMarkdown = () => c.getMarkdown();
          // 문서 내 검색: 열린 문서의 에디터에 연결한다
          const view = c.editor.action((ctx) => ctx.get(editorViewCtx));
          ctl = attachFinder(view, (st) => Object.assign(finder, st));
          finder.ctlPath = doc.path;
          finder.ctl = ctl;
          // 이미지 드롭: 본문 영역 밖에 놓아도 업로드해서 삽입한다
          detachDrop = attachImageDrop({
            view,
            imageBlock: c.editor.action((ctx) => imageBlockSchema.type(ctx)),
            upload,
            isReadonly: () => readonly,
            onOver: (v) => { dragging = v; },
            onMessage: (t, k) => toast(t, k),
          });
        });
      });
    });
    return () => {
      disposed = true;
      ready = false;
      builder = undefined;
      detachDrop?.();
      if (ctl) {
        ctl.destroy();
        if (finder.ctl === ctl) { finder.ctl = null; finder.total = 0; finder.current = -1; finder.error = ''; }
      }
      void crepe?.destroy();
    };
  });
</script>

<svelte:window onscrollcapture={hideZoom} />

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
  class="editor-host"
  class:is-readonly={readonly}
  bind:this={host}
  onmouseover={onOver}
  onmouseleave={() => { hideTimer = setTimeout(() => { zoomBtn = null; hoverImg = null; }, 250); }}
  ondblclick={onDblClick}
  role="presentation"
></div>

{#if zoomBtn}
  <button
    class="zoom-btn"
    style:left="{zoomBtn.x}px"
    style:top="{zoomBtn.y}px"
    title="이미지 크게 보기 (더블클릭)"
    aria-label="이미지 크게 보기"
    onmouseenter={() => clearTimeout(hideTimer)}
    onmouseleave={() => { hideTimer = setTimeout(() => { zoomBtn = null; hoverImg = null; }, 250); }}
    onclick={() => hoverImg && openLightbox(hoverImg)}
  ><ZoomIn size={16} /></button>
{/if}

{#if dragging}
  <div class="drop-hint" aria-hidden="true">이미지를 놓으면 본문에 삽입됩니다</div>
{/if}

{#if lightbox}
  <ImageLightbox items={lightbox.items} bind:index={lightbox.index} onclose={() => (lightbox = null)} />
{/if}
