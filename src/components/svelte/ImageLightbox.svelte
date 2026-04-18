<script lang="ts">
  import { onMount } from 'svelte';

  let dialog = $state<HTMLDialogElement | null>(null);
  let currentSrc = $state('');
  let currentAlt = $state('');
  let allImages = $state<HTMLImageElement[]>([]);
  let currentIndex = $state(0);
  let scale = $state(1);
  let translateX = $state(0);
  let translateY = $state(0);
  let isDragging = $state(false);
  let dragStart = $state({ x: 0, y: 0, tx: 0, ty: 0 });

  function open(img: HTMLImageElement, images: HTMLImageElement[]) {
    allImages = images;
    currentIndex = images.indexOf(img);
    load(currentIndex);
    dialog?.showModal();
  }

  function load(idx: number) {
    const img = allImages[idx];
    if (!img) return;
    currentSrc = img.src;
    currentAlt = img.alt || '';
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function close() {
    dialog?.close();
    currentSrc = '';
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      load(currentIndex);
    }
  }

  function next() {
    if (currentIndex < allImages.length - 1) {
      currentIndex++;
      load(currentIndex);
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (!dialog?.open) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === dialog) close();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    scale = Math.max(0.5, Math.min(5, scale + delta));
  }

  function onMousedown(e: MouseEvent) {
    if (scale <= 1) return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY, tx: translateX, ty: translateY };
  }

  function onMousemove(e: MouseEvent) {
    if (!isDragging) return;
    translateX = dragStart.tx + (e.clientX - dragStart.x);
    translateY = dragStart.ty + (e.clientY - dragStart.y);
  }

  function onMouseup() {
    isDragging = false;
  }

  onMount(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return;

    const imgs = Array.from(prose.querySelectorAll<HTMLImageElement>('img'));
    if (imgs.length === 0) return;

    imgs.forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => open(img, imgs));
    });

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  bind:this={dialog}
  class="lightbox"
  onclick={onBackdropClick}
  onwheel={onWheel}
  onmousedown={onMousedown}
  onmousemove={onMousemove}
  onmouseup={onMouseup}
>
  <div class="lightbox__inner">
    {#if currentSrc}
      <img
        src={currentSrc}
        alt={currentAlt}
        class="lightbox__img"
        style="transform: scale({scale}) translate({translateX / scale}px, {translateY / scale}px); cursor: {isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'zoom-in'};"
        draggable="false"
      />
    {/if}
  </div>

  <button class="lightbox__close" onclick={close} aria-label="닫기">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
  </button>

  {#if allImages.length > 1}
    <button
      class="lightbox__nav lightbox__nav--prev"
      onclick={(e) => { e.stopPropagation(); prev(); }}
      aria-label="이전 이미지"
      disabled={currentIndex === 0}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <button
      class="lightbox__nav lightbox__nav--next"
      onclick={(e) => { e.stopPropagation(); next(); }}
      aria-label="다음 이미지"
      disabled={currentIndex === allImages.length - 1}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>

    <div class="lightbox__counter">
      {currentIndex + 1} / {allImages.length}
    </div>
  {/if}
</dialog>

<style>
  .lightbox {
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    overflow: hidden;
  }

  .lightbox::backdrop {
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(4px);
  }

  .lightbox__inner {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .lightbox__img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    transform-origin: center;
    transition: transform 0.1s ease;
    user-select: none;
    pointer-events: none;
  }

  .lightbox__close {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    z-index: 10;
  }

  .lightbox__close:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .lightbox__nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    z-index: 10;
  }

  .lightbox__nav:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .lightbox__nav:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .lightbox__nav--prev { left: 20px; }
  .lightbox__nav--next { right: 20px; }

  .lightbox__counter {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-family: var(--font-sans, system-ui);
    background: rgba(0, 0, 0, 0.4);
    padding: 4px 12px;
    border-radius: 20px;
    pointer-events: none;
    z-index: 10;
  }
</style>
