import '@fontsource/libre-franklin/400.css';
import '@fontsource/libre-franklin/500.css';
import '@fontsource/libre-franklin/600.css';
import '@fontsource/libre-franklin/700.css';
import '@fontsource/libre-franklin/800.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import './styles/base.css';
import './styles/app.css';
import './styles/views.css';
import './styles/print.css';

import { auth } from './api';
import { esc, toast } from './lib/dom';
import { applyTheme } from './lib/theme';
import { store } from './store';
import type { SessionInfo } from './types';
import { renderAuth } from './views/auth';
import { mountShell } from './views/shell';

const app = document.querySelector<HTMLDivElement>('#app')!;
let shell: ReturnType<typeof mountShell> | null = null;

async function signedIn(session: SessionInfo) {
  auth.set(session);
  await Promise.all([store.loadSettings(), store.loadTemplates(), store.loadPaymentMethods(), store.loadCategories()]);
  applyTheme(store.settings.theme_primary, store.settings.theme_secondary, store.settings.theme_mode);
  shell = mountShell(app, signOut);
}

function signOut() {
  shell?.dispose();
  shell = null;
  auth.set(null);
  store.products = [];
  document.querySelectorAll('.modal-wrap').forEach((m) => m.remove());
  document.body.classList.remove('has-modal');
  start();
}

auth.onExpired(() => {
  if (!auth.session) return;
  toast('Your session ended. Sign in again to continue.', 'info');
  signOut();
});

async function start() {
  try {
    await renderAuth(app, signedIn);
  } catch (e) {
    app.innerHTML = `<div class="fatal"><h2>The local database could not be opened</h2><p>${esc(e instanceof Error ? e.message : e)}</p><p>Close and reopen the app. If this keeps happening, check that your user account can write to the app data folder.</p></div>`;
  }
}

// Disable the webview's default context menu outside text fields for a native feel.
document.addEventListener('contextmenu', (e) => {
  if (!(e.target as HTMLElement).closest('input, textarea, [contenteditable]')) e.preventDefault();
});

start();
