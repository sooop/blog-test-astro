<script lang="ts">
  import { onMount } from 'svelte';

  type Theme = 'light' | 'dark' | 'system';

  let theme = $state<Theme>('system');

  const ICONS: Record<Theme, string> = {
    light: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
    dark: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
    system: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  };

  const LABELS: Record<Theme, string> = {
    light: '라이트 모드',
    dark: '다크 모드',
    system: '시스템 모드',
  };

  const CYCLE: Theme[] = ['light', 'dark', 'system'];

  function applyTheme(t: Theme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = t === 'dark' || (t === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  }

  function cycle() {
    const idx = CYCLE.indexOf(theme);
    theme = CYCLE[(idx + 1) % CYCLE.length];
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  }

  onMount(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    theme = stored ?? 'system';
    applyTheme(theme);

    // Keep in sync if system preference changes while in system mode
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (theme === 'system') applyTheme('system');
      });
  });
</script>

<button
  onclick={cycle}
  aria-label={LABELS[theme]}
  title={LABELS[theme]}
  class="theme-toggle"
>
  {@html ICONS[theme]}
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
  }
  .theme-toggle:hover {
    color: var(--foreground);
    background-color: var(--secondary);
    border-color: var(--foreground);
  }
  .theme-toggle:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
</style>
