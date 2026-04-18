<script lang="ts">
  import { onDestroy } from 'svelte';

  type OpKey = 'lcm' | 'sum' | 'product' | 'max';

  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  function lcm(a: number, b: number): number {
    return (a / gcd(a, b)) * b;
  }

  const OPS: Record<OpKey, {
    label: string;
    list: number[];
    init: number;
    fn: (a: number, b: number) => number;
    exprLabel: (a: number, b: number) => string;
  }> = {
    lcm: {
      label: 'lcm',
      list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      init: 1,
      fn: lcm,
      exprLabel: (a, b) => `lcm(${a}, ${b})`,
    },
    sum: {
      label: '+',
      list: [1, 2, 3, 4, 5],
      init: 0,
      fn: (a, b) => a + b,
      exprLabel: (a, b) => `${a} + ${b}`,
    },
    product: {
      label: '×',
      list: [1, 2, 3, 4, 5],
      init: 1,
      fn: (a, b) => a * b,
      exprLabel: (a, b) => `${a} × ${b}`,
    },
    max: {
      label: 'max',
      list: [3, 1, 4, 1, 5, 9, 2, 6],
      init: -Infinity,
      fn: Math.max,
      exprLabel: (a, b) => `max(${a}, ${b})`,
    },
  };

  let opKey = $state<OpKey>('lcm');
  let step = $state(0);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  const op = $derived(OPS[opKey]);

  const steps = $derived(
    op.list.reduce<{ acc: number; x: number | null; next: number; expr: string }[]>(
      (arr, x, i) => {
        const prev = arr[i].acc;
        const next = op.fn(prev, x);
        arr.push({ acc: next, x, next, expr: op.exprLabel(prev, x) });
        return arr;
      },
      [{ acc: op.init, x: null, next: op.init, expr: '' }]
    )
  );

  const current = $derived(steps[step]);
  const total = $derived(op.list.length);
  const done = $derived(step >= total);

  function selectOp(key: OpKey) {
    opKey = key;
    step = 0;
    stopPlay();
  }

  function next() {
    if (step < total) step++;
    if (step >= total) stopPlay();
  }

  function prev() {
    if (step > 0) step--;
    stopPlay();
  }

  function reset() {
    step = 0;
    stopPlay();
  }

  function stopPlay() {
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function togglePlay() {
    if (playing) { stopPlay(); return; }
    if (done) { step = 0; }
    playing = true;
    timer = setInterval(() => {
      if (step < total) {
        step++;
      }
      if (step >= total) stopPlay();
    }, 900);
  }

  onDestroy(() => { if (timer) clearInterval(timer); });
</script>

<div class="my-8 border border-border bg-card rounded-sm p-5 select-none">
  <!-- Header -->
  <p class="text-xs text-muted-foreground mb-4 font-mono uppercase tracking-widest">reduce 시각화</p>

  <!-- Op tabs -->
  <div class="flex gap-2 mb-6" role="tablist" aria-label="연산 선택">
    {#each Object.entries(OPS) as [key, def]}
      <button
        role="tab"
        aria-selected={opKey === key}
        class="px-3 py-1 text-sm font-mono border transition-colors
          {opKey === key
            ? 'bg-foreground text-background border-foreground'
            : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground'}"
        onclick={() => selectOp(key as OpKey)}
      >{def.label}</button>
    {/each}
  </div>

  <!-- List -->
  <div class="flex flex-wrap gap-2 mb-6" aria-label="입력 리스트">
    {#each op.list as x, i}
      {@const state = i < step ? 'done' : i === step ? 'active' : 'pending'}
      <div
        class="w-10 h-10 flex items-center justify-center border text-sm font-mono transition-all duration-300
          {state === 'done' ? 'bg-muted text-muted-foreground border-border opacity-50' :
           state === 'active' ? 'bg-foreground text-background border-foreground scale-110' :
           'bg-card text-foreground border-border'}"
        aria-label="원소 {x}, 상태 {state}"
      >{x}</div>
    {/each}
  </div>

  <!-- Accumulator + expr -->
  <div class="flex items-center gap-4 mb-6">
    <div class="flex flex-col items-center">
      <span class="text-xs text-muted-foreground font-mono mb-1">acc</span>
      <div class="min-w-[4rem] h-12 flex items-center justify-center border border-accent bg-card text-foreground font-mono text-lg font-bold transition-all duration-300">
        {current.acc === -Infinity ? '−∞' : current.acc}
      </div>
    </div>
    {#if step > 0 && step <= total}
      <div class="flex flex-col items-center text-sm font-mono text-muted-foreground">
        <span class="mb-1">&nbsp;</span>
        <span class="border border-border px-3 h-12 flex items-center bg-card">
          {current.expr} = {current.next}
        </span>
      </div>
    {/if}
  </div>

  <!-- Progress + controls -->
  <div class="flex items-center gap-2 flex-wrap">
    <span class="text-xs font-mono text-muted-foreground w-16">{step} / {total}</span>
    <button
      onclick={prev}
      disabled={step === 0}
      aria-label="이전 단계"
      class="px-3 py-1.5 text-sm border border-border font-mono hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >◀</button>
    <button
      onclick={next}
      disabled={done}
      aria-label="다음 단계"
      class="px-3 py-1.5 text-sm border border-border font-mono hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >▶</button>
    <button
      onclick={togglePlay}
      aria-pressed={playing}
      aria-label={playing ? '자동재생 중지' : '자동재생'}
      class="px-3 py-1.5 text-sm border font-mono transition-colors
        {playing ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted'}"
    >{playing ? '■ 정지' : '▶▶ 자동'}</button>
    <button
      onclick={reset}
      aria-label="처음으로"
      class="px-3 py-1.5 text-sm border border-border font-mono hover:bg-muted transition-colors"
    >⟲</button>
  </div>
</div>
