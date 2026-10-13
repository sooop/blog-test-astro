<script lang="ts">
  // 이미지 상세 보기: 본문에서 줄어들어 표시된 큰 이미지를 원래 크기까지 확대해서 본다.
  import X from '@lucide/svelte/icons/x';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import Maximize from '@lucide/svelte/icons/maximize';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  export interface LightboxItem { src: string; alt: string }
  interface Props { items: LightboxItem[]; index: number; onclose: () => void }
  let { items, index = $bindable(), onclose }: Props = $props();

  const STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
  let scale = $state<number | 'fit'>('fit'); // 'fit': 화면에 맞춤, 숫자: 원래 크기 대비 배율
  let natural = $state({ w: 0, h: 0 });
  let box = $state<HTMLElement>();

  const item = $derived(items[index]);
  const label = $derived(scale === 'fit' ? '맞춤' : `${Math.round(scale * 100)}%`);

  // 이미지를 바꾸면 맞춤으로 돌아간다
  $effect(() => { item; scale = 'fit'; natural = { w: 0, h: 0 }; box?.scrollTo(0, 0); });

  // 맞춤 배율(화면 안에 들어오게 줄였을 때의 실제 배율)
  function fitScale(): number {
    if (!box || !natural.w) return 1;
    return Math.min(1, (box.clientWidth - 32) / natural.w, (box.clientHeight - 32) / natural.h);
  }
  const current = () => (scale === 'fit' ? fitScale() : scale);

  function zoom(dir: 1 | -1) {
    const cur = current();
    const next = dir > 0 ? STEPS.find((s) => s > cur + 1e-6) : [...STEPS].reverse().find((s) => s < cur - 1e-6);
    if (next) scale = next;
  }
  // 맞춤 ↔ 100%
  const toggle = () => { scale = scale === 'fit' ? 1 : 'fit'; };
  const step = (d: number) => { if (items.length > 1) index = (index + d + items.length) % items.length; };

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onclose(); }
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === '+' || e.key === '=') zoom(1);
    else if (e.key === '-') zoom(-1);
    else if (e.key === '0') scale = 'fit';
    else if (e.key === '1') scale = 1;
  }
  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return; // 일반 휠은 확대 상태에서의 스크롤에 쓴다
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1 : -1);
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="lb" role="dialog" aria-modal="true" aria-label="이미지 상세 보기">
  <header class="lb-bar">
    <span class="lb-title" title={item?.alt}>{item?.alt || '이미지'}{#if items.length > 1} <small>{index + 1} / {items.length}</small>{/if}</span>
    <span class="lb-size">{#if natural.w}{natural.w} × {natural.h}px{/if}</span>
    <span class="spacer"></span>
    {#if items.length > 1}
      <button class="icon-btn" title="이전 (←)" aria-label="이전 이미지" onclick={() => step(-1)}><ChevronLeft size={18} /></button>
      <button class="icon-btn" title="다음 (→)" aria-label="다음 이미지" onclick={() => step(1)}><ChevronRight size={18} /></button>
    {/if}
    <button class="icon-btn" title="축소 (−)" aria-label="축소" onclick={() => zoom(-1)}><ZoomOut size={18} /></button>
    <button class="lb-zoom" title="맞춤 ↔ 100% (이미지 클릭)" onclick={toggle}>{label}</button>
    <button class="icon-btn" title="확대 (+)" aria-label="확대" onclick={() => zoom(1)}><ZoomIn size={18} /></button>
    <button class="icon-btn" title="화면에 맞춤 (0)" aria-label="화면에 맞춤" onclick={() => (scale = 'fit')}><Maximize size={18} /></button>
    <button class="icon-btn" title="닫기 (Esc)" aria-label="닫기" onclick={onclose}><X size={18} /></button>
  </header>

  <div class="lb-stage" bind:this={box} onwheel={onWheel} onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    {#if item}
      <!-- 마우스 전용 편의 동작(맞춤 ↔ 100%): 키보드는 1 / 0 키가 같은 일을 한다 -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <img
        src={item.src}
        alt={item.alt}
        draggable="false"
        class:fit={scale === 'fit'}
        style:width={scale === 'fit' || !natural.w ? undefined : `${natural.w * scale}px`}
        style:cursor={scale === 'fit' ? 'zoom-in' : 'zoom-out'}
        onload={(e) => { const el = e.currentTarget as HTMLImageElement; natural = { w: el.naturalWidth, h: el.naturalHeight }; }}
        onclick={toggle}
      />
    {/if}
  </div>
</div>
