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
import './styles/v2.css';

import { auth } from './api';
import { esc, toast } from './lib/dom';
import { licence, renderLicenceScreen } from './lib/license-ui';
import { checkForUpdate } from './lib/updater';
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
  showTrialBanner();
  if (auth.can('manager')) checkUpdatesQuietly();
}

function showTrialBanner() {
  const s = licence.status;
  if (!shell || !s || s.state !== 'trial') return;
  const left = `Free trial: <b>${s.trial_days_left} day${s.trial_days_left === 1 ? '' : 's'} left</b>.`;
  shell.setBanner('trial', auth.can('owner')
    ? `<span>${left} Activate any time to keep using eStock Manager after the trial.</span><button class="btn btn-sm btn-primary" data-banner-go="settings" data-section="licence">Activate</button>`
    : `<span>${left} Ask the owner to activate eStock Manager.</span>`);
}

// Looks for a new version once per sign-in; never interrupts a sale.
async function checkUpdatesQuietly() {
  try {
    const u = await checkForUpdate();
    if (u && shell) shell.setBanner('update', `<span>eStock Manager <b>${esc(u.version)}</b> is ready to install.</span><button class="btn btn-sm btn-primary" data-banner-go="settings" data-section="updates">See update</button>`);
  } catch { /* offline or no release yet: try again next sign-in */ }
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

auth.onLicenceRequired(async () => {
  const s = await licence.refresh();
  if (s && s.state === 'expired') { shell?.dispose(); shell = null; auth.set(null); document.querySelectorAll('.modal-wrap').forEach((m) => m.remove()); document.body.classList.remove('has-modal'); renderLicenceScreen(app, s, start); }
});

auth.onExpired(() => {
  if (!auth.session) return;
  toast('Your session ended. Sign in again to continue.', 'info');
  signOut();
});

async function start() {
  try {
    const lic = await licence.refresh();
    if (lic && lic.state === 'expired') { renderLicenceScreen(app, lic, start); return; }
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
