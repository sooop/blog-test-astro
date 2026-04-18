<script lang="ts">
  interface Draft {
    title: string;
    slug: string;
  }

  interface Props {
    drafts: Draft[];
    currentSlug?: string;
  }

  let { drafts, currentSlug }: Props = $props();

  let query = $state('');
  let debouncedQuery = $state('');

  $effect(() => {
    const q = query;
    const id = setTimeout(() => {
      debouncedQuery = q.length >= 2 ? q : '';
    }, 200);
    return () => clearTimeout(id);
  });

  const filtered = $derived(
    debouncedQuery
      ? drafts.filter(
          (d) =>
            d.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
            d.slug.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
      : drafts
  );

  function highlight(text: string, q: string): { before: string; match: string; after: string } | null {
    if (!q) return null;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return null;
    return {
      before: text.slice(0, idx),
      match: text.slice(idx, idx + q.length),
      after: text.slice(idx + q.length),
    };
  }
</script>

<aside class="flex flex-col h-full border-r border-border bg-card">
  <!-- Filter input -->
  <div class="p-3 border-b border-border">
    <div class="relative">
      <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
      </svg>
      <input
        type="search"
        bind:value={query}
        placeholder="제목, 슬러그 검색…"
        aria-label="초안 필터"
        class="w-full pl-7 pr-3 py-1.5 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
      />
    </div>
    {#if debouncedQuery}
      <p class="mt-1.5 text-xs text-muted-foreground">{filtered.length}개 매치</p>
    {/if}
  </div>

  <!-- Draft list -->
  <nav class="flex-1 overflow-y-auto py-1" aria-label="초안 목록">
    {#if filtered.length === 0}
      <p class="px-3 py-4 text-xs text-muted-foreground text-center">검색 결과 없음</p>
    {:else}
      <ul>
        {#each filtered as draft}
          {@const titleHl = highlight(draft.title, debouncedQuery)}
          {@const slugHl = highlight(draft.slug, debouncedQuery)}
          {@const active = draft.slug === currentSlug}
          <li>
            <a
              href={`/draft/${draft.slug}`}
              aria-current={active ? 'page' : undefined}
              class="block px-3 py-2.5 border-l-2 transition-colors text-xs leading-snug
                {active
                  ? 'border-foreground bg-muted text-foreground font-medium'
                  : 'border-transparent hover:border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'}"
            >
              <span class="block font-medium mb-0.5">
                {#if titleHl}
                  {titleHl.before}<mark class="bg-accent/25 text-foreground not-italic px-0">{titleHl.match}</mark>{titleHl.after}
                {:else}
                  {draft.title}
                {/if}
              </span>
              <span class="block font-mono opacity-60 text-[0.7rem]">
                {#if slugHl}
                  {slugHl.before}<mark class="bg-accent/25 text-foreground not-italic px-0">{slugHl.match}</mark>{slugHl.after}
                {:else}
                  {draft.slug}
                {/if}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </nav>
</aside>
