<script lang="ts">
  import { tick } from 'svelte';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import Clock from '@lucide/svelte/icons/clock';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
  import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
  import X from '@lucide/svelte/icons/x';
  import { toParts, fromParts } from '../frontmatter';

  interface Props {
    value: string; // 파일에 저장된 원문 값 (빈 문자열이면 없음)
    disabled?: boolean;
    label: string;
    id?: string;
    onchange: (value: string) => void; // 새 값(형식은 기존 값을 따름). 빈 문자열이면 지움
  }
  let { value, disabled = false, label, id, onchange }: Props = $props();

  const parts = $derived(toParts(value)); // null: 날짜로 해석되지 않는 값
  let open = $state<'' | 'date' | 'time'>('');
  let view = $state({ y: 2000, m: 0 }); // 달력에 보이는 달 (m: 0~11)
  let root = $state<HTMLElement>();

  const p2 = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const today = () => ymd(new Date());
  const nowTime = () => {
    const d = new Date();
    return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  };
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  const date = $derived(parts?.date ?? '');
  const time = $derived(parts?.time ?? '');
  const [selH, selM] = $derived([Number(time.slice(0, 2)), Number(time.slice(3, 5))]);

  function emit(d: string, t: string) {
    onchange(fromParts(d, t, parts?.style ?? 'z'));
  }
  // 날짜를 고르면 시간은 유지하고, 시간이 없던 새 값이면 지금 시각으로 채운다(날짜만 쓰던 값은 날짜만 유지)
  function pickDate(d: string) {
    emit(d, time || (parts?.style === 'date' ? '' : nowTime()));
    open = '';
  }
  // 시간을 고르면 날짜는 유지하고, 날짜가 없으면 오늘로 채운다
  function pickTime(t: string, close = false) {
    emit(date || today(), t);
    if (close) open = '';
  }
  const setNow = () => emit(today(), nowTime());
  const setNowTime = () => pickTime(nowTime(), true);
  const secs = () => time.slice(6, 8) || '00';

  function toggle(which: 'date' | 'time') {
    if (disabled) return;
    if (open === which) { open = ''; return; }
    open = which;
    if (which === 'date') {
      const base = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date();
      view = { y: base.getFullYear(), m: base.getMonth() };
    } else {
      void tick().then(() => root?.querySelectorAll('.dtp-col .on').forEach((el) => el.scrollIntoView({ block: 'center' })));
    }
  }
  function shift(months: number) {
    const d = new Date(view.y, view.m + months, 1);
    view = { y: d.getFullYear(), m: d.getMonth() };
  }

  // 6주 × 7일 격자 (앞뒤 달의 날짜는 흐리게)
  const cells = $derived.by(() => {
    const first = new Date(view.y, view.m, 1);
    const start = new Date(view.y, view.m, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { key: ymd(d), day: d.getDate(), other: d.getMonth() !== view.m };
    });
  });

  // 직접 입력: 형식이 맞을 때만 반영하고, 아니면 이전 값으로 되돌린다
  function typedDate(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const v = el.value.trim();
    if (!v) { onchange(''); return; }
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])) {
        pickDate(ymd(d));
        return;
      }
    }
    el.value = date;
  }
  function typedTime(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(el.value.trim());
    if (m && Number(m[1]) < 24 && Number(m[2]) < 60 && Number(m[3] ?? 0) < 60) {
      pickTime(`${p2(Number(m[1]))}:${m[2]}:${m[3] ?? '00'}`);
      return;
    }
    el.value = time;
  }

  const PRESETS: [string, string][] = [['자정', '00:00:00'], ['오전 9시', '09:00:00'], ['정오', '12:00:00'], ['오후 6시', '18:00:00']];

  function onDocPointer(e: PointerEvent) {
    if (open && root && !root.contains(e.target as Node)) open = '';
  }
</script>

<svelte:window onpointerdown={onDocPointer} onkeydown={(e) => { if (e.key === 'Escape') open = ''; }} />

<div class="dtp" bind:this={root}>
  {#if parts}
    <div class="dtp-row">
      <div class="dtp-box" class:disabled>
        <input
          {id}
          class="dtp-text"
          size="10"
          placeholder="YYYY-MM-DD"
          {disabled}
          value={date}
          aria-label={`${label} 날짜`}
          onchange={typedDate}
        />
        <button class="icon-btn" {disabled} title="달력 열기" aria-label={`${label} 달력`} aria-expanded={open === 'date'} onclick={() => toggle('date')}><CalendarIcon size={15} /></button>
      </div>

      <div class="dtp-box" class:disabled>
        <input
          class="dtp-text"
          size="8"
          placeholder="HH:mm:ss"
          disabled={disabled || !date}
          value={time}
          aria-label={`${label} 시간`}
          onchange={typedTime}
        />
        <button class="icon-btn" {disabled} title="시간 선택" aria-label={`${label} 시간 선택`} aria-expanded={open === 'time'} onclick={() => toggle('time')}><Clock size={15} /></button>
      </div>

      <!-- 바로가기: 시간만 지금으로 / 날짜+시간을 지금으로 -->
      <button class="dtp-quick" {disabled} title="시간을 현재 시각으로" onclick={setNowTime}>지금</button>
      {#if value}
        <button class="icon-btn" {disabled} title="값 지우기" aria-label={`${label} 지우기`} onclick={() => onchange('')}><X size={14} /></button>
      {/if}
    </div>
  {:else}
    <!-- 날짜로 해석되지 않는 값: 원문을 보여주고 직접 고치거나 새로 고르게 한다 -->
    <div class="dtp-row">
      <input {id} class="dtp-raw" {disabled} {value} aria-label={label} oninput={(e) => onchange(e.currentTarget.value)} />
      <button class="dtp-quick" {disabled} onclick={setNow}>오늘 · 지금</button>
    </div>
  {/if}

  {#if open === 'date'}
    <div class="dtp-pop" role="dialog" aria-label="날짜 선택">
      <div class="dtp-head">
        <button class="icon-btn" title="이전 해" aria-label="이전 해" onclick={() => shift(-12)}><ChevronsLeft size={15} /></button>
        <button class="icon-btn" title="이전 달" aria-label="이전 달" onclick={() => shift(-1)}><ChevronLeft size={15} /></button>
        <strong>{view.y}년 {view.m + 1}월</strong>
        <button class="icon-btn" title="다음 달" aria-label="다음 달" onclick={() => shift(1)}><ChevronRight size={15} /></button>
        <button class="icon-btn" title="다음 해" aria-label="다음 해" onclick={() => shift(12)}><ChevronsRight size={15} /></button>
      </div>
      <div class="dtp-grid">
        {#each WEEK as w, i}<span class="dtp-dow" class:sun={i === 0} class:sat={i === 6}>{w}</span>{/each}
        {#each cells as c (c.key)}
          <button class="dtp-day" class:other={c.other} class:today={c.key === today()} class:on={c.key === date} onclick={() => pickDate(c.key)}>{c.day}</button>
        {/each}
      </div>
      <div class="dtp-foot">
        <button class="link-btn" onclick={() => pickDate(today())}>오늘</button>
        <button class="link-btn" onclick={() => { setNow(); open = ''; }}>오늘 · 지금</button>
        <button class="link-btn" onclick={() => { onchange(''); open = ''; }}>지우기</button>
      </div>
    </div>
  {/if}

  {#if open === 'time'}
    <div class="dtp-pop dtp-timepop" role="dialog" aria-label="시간 선택">
      <button class="primary dtp-now" onclick={setNowTime}><Clock size={14} />지금 ({nowTime().slice(0, 5)})</button>
      <div class="dtp-presets">
        {#each PRESETS as [name, t]}<button class="dtp-chip" onclick={() => pickTime(t, true)}>{name}</button>{/each}
      </div>
      <div class="dtp-cols">
        <div class="dtp-col" aria-label="시">
          {#each Array.from({ length: 24 }, (_, h) => h) as h}
            <button class:on={date && h === selH} onclick={() => pickTime(`${p2(h)}:${p2(selM || 0)}:${secs()}`)}>{p2(h)}</button>
          {/each}
        </div>
        <div class="dtp-col" aria-label="분">
          {#each Array.from({ length: 60 }, (_, m) => m) as m}
            <button class:on={date && m === selM} onclick={() => pickTime(`${p2(selH || 0)}:${p2(m)}:${secs()}`)}>{p2(m)}</button>
          {/each}
        </div>
      </div>
      <div class="dtp-foot"><button class="link-btn" onclick={() => (open = '')}>닫기</button></div>
    </div>
  {/if}
</div>
