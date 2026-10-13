import { mount } from 'svelte';
import './app.css';
import './editor-extra.css';
import App from './App.svelte';
import ServerShell from './lib/components/ServerShell.svelte';
import { applyTheme, applyLayout } from './lib/store.svelte';

applyTheme();
applyLayout();
mount(App, { target: document.getElementById('app')!, props: { Shell: ServerShell } });
