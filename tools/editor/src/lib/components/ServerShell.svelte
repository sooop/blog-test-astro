<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from './Editor.svelte';
  import TreeNode from './TreeNode.svelte';
  import Settings from './Settings.svelte';
  import ModeToggle from './ModeToggle.svelte';
  import FrontmatterPanel from './FrontmatterPanel.svelte';
  import FindBar from './FindBar.svelte';
  import SearchPanel from './SearchPanel.svelte';
  import Search from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import FilePlus from '@lucide/svelte/icons/file-plus';
  import FolderPlus from '@lucide/svelte/icons/folder-plus';
  import PanelLeft from '@lucide/svelte/icons/panel-left';
  import Save from '@lucide/svelte/icons/save';
  import Send from '@lucide/svelte/icons/send';
  import { doc } from '../store.svelte';
  import {
    tree, nav, init, openDoc, save, onEditorChange, upload, resolveUrl, createDoc, createFolder, searchFiles, publishDoc,
  } from '../server-mode.svelte';
  import { stripExt } from '../utils';
  import { ui, searchShortcut } from '../search/state.svelte';
  import { filterTree } from '../search/nameMatch';

  let sidebarOpen = $state(true);

  const visibleNodes = $derived(nav.filter.trim() ? filterTree(tree.nodes, nav.filter) : tree.nodes);

  onMount(() => { void init(); });

  function onKey(e: KeyboardEvent) {
    if (searchShortcut(e, !!doc.path) === 'global') sidebarOpen = true;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void save();
    }
  }
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (doc.dirty) e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKey} onbeforeunload={onBeforeUnload} />
<svelte:head>
  <title>{doc.dirty ? '● ' : ''}{doc.path ? stripExt(doc.name) : 'Notes'}</title>
</svelte:head>

<div class="shell">
  {#if sidebarOpen}
    <aside class="sidebar">
      <header>
        <button
          class="root-btn"
          class:selected={nav.dir === ''}
          title={`${tree.root} (새 문서는 선택한 폴더에 만들어집니다)`}
          onclick={() => (nav.dir = '')}
        >{tree.root || 'Notes'}</button>
        <span class="ops-head">
          <button class="icon-btn" title="새 문서" aria-label="새 문서" onclick={() => createDoc(nav.dir)}><FilePlus size={17} /></button>
          <button class="icon-btn" title="새 폴더" aria-label="새 폴더" onclick={() => createFolder(nav.dir)}><FolderPlus size={17} /></button>
        </span>
      </header>
      <div class="sidetabs" role="tablist">
        <button role="tab" class:on={ui.tab === 'files'} aria-selected={ui.tab === 'files'} onclick={() => (ui.tab = 'files')}>파일</button>
        <button role="tab" class:on={ui.tab === 'search'} aria-selected={ui.tab === 'search'} onclick={() => { ui.tab = 'search'; ui.globalFocus++; }} title="모든 문서에서 검색 (Ctrl+Shift+F)">검색</button>
      </div>
      <div class="tabpane" hidden={ui.tab !== 'files'}>
        <div class="filterbox">
          <Search size={14} />
          <input bind:value={nav.filter} placeholder="파일 이름 검색 (초성 가능)" aria-label="파일 이름 검색" spellcheck="false" />
          {#if nav.filter}<button class="icon-btn" title="지우기" aria-label="검색어 지우기" onclick={() => (nav.filter = '')}><X size={14} /></button>{/if}
        </div>
        <nav class="tree">
          {#if visibleNodes.length}
            <ul>
              {#each visibleNodes as node (node.path)}
                <TreeNode {node} />
              {/each}
            </ul>
          {:else if nav.filter.trim()}
            <p class="empty">'{nav.filter}' 와 일치하는 파일이 없습니다.</p>
          {:else}
            <p class="empty">문서가 없습니다. 위의 새 문서 버튼으로 만드세요.</p>
          {/if}
        </nav>
      </div>
      <div class="tabpane" hidden={ui.tab !== 'search'}>
        <SearchPanel run={searchFiles} onOpen={openDoc} activeId={doc.path} />
      </div>
    </aside>
  {/if}

  <main class="main">
    <header class="topbar">
      <button class="icon-btn" aria-label="사이드바 토글" onclick={() => (sidebarOpen = !sidebarOpen)}><PanelLeft size={18} /></button>
      <h1 class="doc-title">
        {doc.path ? stripExt(doc.name) : '문서를 선택하세요'}
        {#if doc.dirty}<span class="dot" title="저장 안 됨">●</span>{/if}
      </h1>
      <span class="spacer"></span>
      {#if doc.path}
        <ModeToggle />
        {#if doc.path.startsWith('draft/')}
          <button title="이 글을 blog 로 발행 (글·이미지 이동, status/발행일 갱신)" onclick={() => publishDoc()}><Send size={15} />발행</button>
        {/if}
        <button class="primary" disabled={!doc.dirty || doc.saving} onclick={() => save()}>
          <Save size={15} />{doc.saving ? '저장 중…' : '저장'}
        </button>
      {/if}
      <Settings />
    </header>

    <section class="editor-wrap">
      <FindBar />
      {#if doc.path}
        {#key doc.path}<FrontmatterPanel />{/key}
        {#key doc.key}
          <Editor initial={doc.content} onChange={onEditorChange} {upload} {resolveUrl} readonly={!doc.edit} />
        {/key}
      {:else}
        <div class="placeholder">왼쪽 목록에서 문서를 열거나 새로 만드세요.</div>
      {/if}
    </section>
  </main>
</div>
