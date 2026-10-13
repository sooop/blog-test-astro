<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import X from '@lucide/svelte/icons/x';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import { doc, toast, errMsg } from '../store.svelte';
  import { meta, onFmChange, addFrontmatter, uploadFeatureImage } from '../server-mode.svelte';
  import {
    parseFm, setField, removeField, asString, asTags, validDate, SLUG_RE,
  } from '../frontmatter';
  import DateTimeInput from './DateTimeInput.svelte';
  import { defOf, collectionOf, type Field } from '../schema';

  const STORE_KEY = 'notes.fmPanel';
  let open = $state(false); // 문서를 열 때마다 접힌 상태로 시작한다(본문이 화면 아래로 밀리지 않게)
  let yamlMode = $state(read('yaml') === '1');
  let tagInput = $state('');

  function read(k: string): string | null {
    try { return localStorage.getItem(`${STORE_KEY}.${k}`); } catch { return null; }
  }
  function remember(k: string, v: string) {
    try { localStorage.setItem(`${STORE_KEY}.${k}`, v); } catch { /* 무시 */ }
  }
  function toggleOpen() { open = !open; }
  function setYaml(v: boolean) { yamlMode = v; remember('yaml', v ? '1' : '0'); }

  const parsed = $derived(parseFm(doc.fm));
  const def = $derived(defOf(doc.path));
  const known = $derived(new Set(def.fields.map((f) => f.key)));
  const locked = $derived(!doc.edit); // 읽기 모드에서는 속성도 바뀌지 않는다
  const val = (k: string) => asString(parsed.data[k]);

  // 같은 컬렉션 안에서 다른 문서가 쓰는 slug
  const dupSlug = $derived.by(() => {
    const s = val('slug');
    if (!s) return false;
    const col = collectionOf(doc.path);
    return meta.docs.some((d) => d.path !== doc.path && collectionOf(d.path) === col && d.slug === s);
  });
  const allTags = $derived.by(() => {
    const m = new Map<string, number>();
    for (const d of meta.docs) for (const t of d.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([t]) => t);
  });
  const allSeries = $derived([...new Set(meta.docs.map((d) => d.series).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, 'ko')));
  const tagList = $derived(asTags(parsed.data.tags));

  // 대표 이미지(feature_image)는 og:image 로만 쓰인다. Ghost 이전 데이터 중 쓸 수 없는 값을 걸러낸다.
  const BAD_IMAGE = /^(__GHOST_URL__|none$|null$)/i;
  function featureSrc(v: string): string | null {
    if (!v || BAD_IMAGE.test(v)) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('/') && !v.startsWith('//')) return `/api/public?path=${encodeURIComponent(v.slice(1))}`;
    return null;
  }
  let imgFailed = $state<Record<string, boolean>>({});
  let uploading = $state(false);
  let dragging = $state(false);
  let fileEl = $state<HTMLInputElement>();

  async function pickFeature(f: Field, file: File) {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      toast('대표 이미지는 png · jpg · webp · gif · avif 만 올릴 수 있습니다 (svg 는 링크 미리보기에서 지원되지 않음)', 'error');
      return;
    }
    uploading = true;
    try {
      set(f, await uploadFeatureImage(file), true);
    } catch (e) {
      toast(`대표 이미지 업로드 실패: ${errMsg(e)}`, 'error');
    } finally {
      uploading = false;
    }
  }

  function problem(f: Field): string {
    const v = val(f.key);
    if (f.kind === 'image' && v) {
      if (BAD_IMAGE.test(v)) return '쓸 수 없는 값입니다 (이전 Ghost 데이터) — 지우거나 새로 업로드하세요';
      if (!featureSrc(v)) return 'https:// 주소 또는 /images/… 형태여야 링크 미리보기에 쓸 수 있습니다';
    }
    if (f.required && !v.trim()) return '필수 항목입니다';
    if (f.kind === 'date' && !validDate(v)) return '날짜 형식이 올바르지 않습니다 (예: 2026-04-18T12:44:00)';
    if (f.kind === 'slug' && v && !SLUG_RE.test(v)) return '영문 소문자·숫자·하이픈만 권장합니다';
    if (f.kind === 'slug' && dupSlug) return '같은 컬렉션에 같은 slug 의 문서가 있습니다';
    if (f.kind === 'number' && v && Number.isNaN(Number(v))) return '숫자여야 합니다';
    return '';
  }
  const problems = $derived(def.fields.map((f) => ({ f, msg: problem(f) })).filter((p) => p.msg));

  // 입력 중에는 빈 값도 키를 유지해 위치가 바뀌지 않게 하고, 입력이 끝나면(change) 선택 필드는 키를 지운다
  function set(f: Field, v: string, commit = false) {
    if (f.kind === 'number') {
      onFmChange(v.trim() === '' ? removeField(doc.fm, f.key) : setField(doc.fm, f.key, Number.isNaN(Number(v)) ? v : Number(v)));
      return;
    }
    if (commit && !f.required && v === '') onFmChange(removeField(doc.fm, f.key));
    else onFmChange(setField(doc.fm, f.key, v));
  }
  const input = (f: Field) => (e: Event) => set(f, (e.currentTarget as HTMLInputElement).value);
  const commit = (f: Field) => (e: Event) => set(f, (e.currentTarget as HTMLInputElement).value, true);

  function setTags(list: string[]) { onFmChange(setField(doc.fm, 'tags', list)); }
  function addTag(raw: string) {
    const t = raw.trim().replace(/,$/, '').trim();
    tagInput = '';
    if (t && !tagList.includes(t)) setTags([...tagList, t]);
  }
  function onTagKey(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    else if (e.key === 'Backspace' && !tagInput && tagList.length) setTags(tagList.slice(0, -1));
  }

  const extra = $derived(Object.keys(parsed.data).filter((k) => !known.has(k)));
  const isScalar = (k: string) => {
    const v = parsed.data[k];
    return v === null || ['string', 'number', 'boolean'].includes(typeof v) || v instanceof Date;
  };
  const statusOptions = $derived([...new Set(['draft', 'published', val('status')].filter(Boolean))]);
</script>

<section class="fm" class:locked>
  <header class="fm-head">
    <button class="fm-toggle" onclick={toggleOpen} aria-expanded={open} title="속성 패널 접기/펼치기">
      {#if open}<ChevronDown size={15} />{:else}<ChevronRight size={15} />{/if}
      <span>속성</span>
    </button>
    {#if !open}<span class="fm-summary">{val('title') || '(제목 없음)'}{val('status') ? ` · ${val('status')}` : ''}</span>{/if}
    {#if problems.length || parsed.error}
      <span class="fm-warn" title={parsed.error || problems.map((p) => `${p.f.label}: ${p.msg}`).join('\n')}>
        <TriangleAlert size={14} />{parsed.error ? 'YAML 오류' : `${problems.length}개 확인 필요`}
      </span>
    {/if}
  </header>

  {#if open}
    <!-- 폼/YAML 전환은 패널이 펼쳐졌을 때만 보인다 (접혀 있으면 전환할 대상이 보이지 않는다) -->
    {#if doc.fmHas}
      <div class="fm-modebar">
        <div class="seg fm-seg">
          <button class:active={!yamlMode && !parsed.error} onclick={() => setYaml(false)} disabled={!!parsed.error}>폼</button>
          <button class:active={yamlMode || !!parsed.error} onclick={() => setYaml(true)}>YAML</button>
        </div>
      </div>
    {/if}
    {#if !doc.fmHas}
      <div class="fm-empty">
        이 문서에는 frontmatter 가 없습니다.
        <button class="primary" disabled={locked} onclick={addFrontmatter} title={locked ? '편집 모드에서 추가할 수 있습니다' : ''}>속성 추가</button>
      </div>
    {:else if yamlMode || parsed.error}
      <div class="fm-yaml">
        <textarea
          spellcheck="false"
          readonly={locked}
          value={doc.fm}
          rows={Math.min(24, Math.max(4, doc.fm.split('\n').length + 1))}
          oninput={(e) => onFmChange(e.currentTarget.value)}
          aria-label="frontmatter YAML"
        ></textarea>
        {#if parsed.error}<p class="fm-err">YAML 오류: {parsed.error} — 고치기 전에는 저장되지 않습니다.</p>{/if}
      </div>
    {:else}
      <div class="fm-grid">
        {#each def.fields as f (f.key)}
          {@const msg = problem(f)}
          <div class="fm-field" class:wide={f.wide || f.kind === 'tags' || f.kind === 'textarea'} class:bad={!!msg}>
            <label for={`fm-${f.key}`}>{f.label}{#if f.required}<b class="req">*</b>{/if}<code>{f.key}</code></label>

            {#if f.kind === 'textarea'}
              <textarea id={`fm-${f.key}`} rows="2" disabled={locked} value={val(f.key)} oninput={input(f)} onchange={commit(f)}></textarea>
            {:else if f.kind === 'tags'}
              <div class="tags" class:disabled={locked}>
                {#each tagList as t (t)}
                  <span class="chip">{t}<button aria-label={`${t} 제거`} disabled={locked} onclick={() => setTags(tagList.filter((x) => x !== t))}><X size={12} /></button></span>
                {/each}
                <input
                  id={`fm-${f.key}`}
                  list="fm-tag-list"
                  placeholder={tagList.length ? '' : '태그 입력 후 Enter'}
                  disabled={locked}
                  bind:value={tagInput}
                  onkeydown={onTagKey}
                  onchange={() => addTag(tagInput)}
                />
              </div>
            {:else if f.kind === 'status'}
              <select id={`fm-${f.key}`} disabled={locked} value={val(f.key)} onchange={commit(f)}>
                <option value="">(없음)</option>
                {#each statusOptions as o}<option value={o}>{o}</option>{/each}
              </select>
            {:else if f.kind === 'series'}
              <input id={`fm-${f.key}`} list="fm-series-list" disabled={locked} value={val(f.key)} oninput={input(f)} onchange={commit(f)} />
            {:else if f.kind === 'date'}
              <DateTimeInput
                id={`fm-${f.key}`}
                label={f.label}
                value={val(f.key)}
                disabled={locked}
                onchange={(v) => set(f, v, true)}
              />
              {#if val(f.key)}<small class="raw" title="파일에 저장되는 값">{val(f.key)}</small>{/if}
            {:else if f.kind === 'image'}
              {@const v = val(f.key)}
              {@const src = featureSrc(v)}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="imgfield"
                class:drag={dragging}
                ondragover={(e) => { if (!locked) { e.preventDefault(); dragging = true; } }}
                ondragleave={() => (dragging = false)}
                ondrop={(e) => { e.preventDefault(); dragging = false; const file = e.dataTransfer?.files?.[0]; if (file && !locked) void pickFeature(f, file); }}
              >
                <div class="with-btn">
                  <input id={`fm-${f.key}`} class="mono" disabled={locked} value={v} placeholder="https://… 또는 /images/…" oninput={input(f)} onchange={commit(f)} />
                  <button disabled={locked || uploading} onclick={() => fileEl?.click()}>{uploading ? '업로드 중…' : '업로드'}</button>
                  {#if v}<button class="icon-btn" title="대표 이미지 지우기" aria-label="대표 이미지 지우기" disabled={locked} onclick={() => set(f, '', true)}><X size={14} /></button>{/if}
                </div>
                <input bind:this={fileEl} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onchange={(e) => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) void pickFeature(f, file); }} />
                {#if src && !imgFailed[src]}
                  <img class="feature-preview" {src} alt="대표 이미지 미리보기" loading="lazy" onerror={() => (imgFailed[src] = true)} />
                {:else if v}
                  <p class="feature-missing">{src ? '이미지를 불러오지 못했습니다 (파일이 없거나 주소가 잘못됨)' : '미리볼 수 없는 값입니다'}</p>
                {:else}
                  <p class="feature-hint">이미지를 여기에 끌어다 놓거나 [업로드] 로 올립니다. 링크 공유(og:image) 미리보기에 쓰이며 <code>public/images/</code> 에 저장됩니다.</p>
                {/if}
              </div>
            {:else}
              <input
                id={`fm-${f.key}`}
                class:mono={f.kind === 'slug'}
                inputmode={f.kind === 'number' ? 'numeric' : undefined}
                disabled={locked}
                value={val(f.key)}
                oninput={input(f)}
                onchange={commit(f)}
              />
            {/if}

            {#if msg}<small class="msg">{msg}</small>{/if}
          </div>
        {/each}

        {#if extra.length}
          <div class="fm-field wide fm-extra">
            <span class="fm-sub">기타 필드 <small>(스키마에 없는 값 — 그대로 보존됩니다)</small></span>
            {#each extra as k (k)}
              <div class="extra-row">
                <code>{k}</code>
                {#if isScalar(k)}
                  <input
                    disabled={locked}
                    value={val(k)}
                    oninput={(e) => onFmChange(setField(doc.fm, k, e.currentTarget.value))}
                  />
                {:else}
                  <span class="muted">{JSON.stringify(parsed.data[k])} <small>(YAML 모드에서 편집)</small></span>
                {/if}
                <button class="icon-btn" aria-label={`${k} 삭제`} title="필드 삭제" disabled={locked} onclick={() => onFmChange(removeField(doc.fm, k))}><X size={14} /></button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <datalist id="fm-tag-list">{#each allTags as t}<option value={t}></option>{/each}</datalist>
      <datalist id="fm-series-list">{#each allSeries as s}<option value={s}></option>{/each}</datalist>
    {/if}
  {/if}
</section>
