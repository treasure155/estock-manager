import { auth, call } from '../api';
import { $, esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { store } from '../store';
import type { Role } from '../types';

export interface ViewCtx {
  main: HTMLElement;
  params: Record<string, unknown>;
  header: (title: string, subtitle?: string, actions?: string) => void;
  go: (view: string, params?: Record<string, unknown>) => void;
  refreshChrome: () => void;
}

export interface ViewDef { id: string; label: string; icon: string; min: Role; group: 'sell' | 'manage' | 'help'; when?: () => boolean; load: () => Promise<{ render: (ctx: ViewCtx) => Promise<void> | void }> }

export const VIEWS: ViewDef[] = [
  { id: 'dashboard', label: 'Overview', icon: 'home', min: 'cashier', group: 'sell', load: () => import('./dashboard') },
  { id: 'pos', label: 'New sale', icon: 'till', min: 'cashier', group: 'sell', load: () => import('./pos') },
  { id: 'receipts', label: 'Receipts', icon: 'receipt', min: 'cashier', group: 'sell', load: () => import('./receipts') },
  { id: 'customers', label: 'Customers', icon: 'people', min: 'cashier', group: 'sell', load: () => import('./customers') },
  { id: 'shifts', label: 'Shifts & cash-up', icon: 'cash', min: 'cashier', group: 'sell', load: () => import('./shifts') },
  { id: 'inventory', label: 'Inventory', icon: 'box', min: 'manager', group: 'manage', load: () => import('./inventory') },
  { id: 'purchases', label: 'Purchases', icon: 'truck', min: 'manager', group: 'manage', load: () => import('./purchases') },
  { id: 'expenses', label: 'Expenses', icon: 'wallet', min: 'manager', group: 'manage', load: () => import('./expenses') },
  { id: 'flocks', label: 'Flocks', icon: 'bird', min: 'cashier', group: 'manage', when: () => store.flag('feature_flocks'), load: () => import('./flocks') },
  { id: 'reports', label: 'Reports', icon: 'chart', min: 'manager', group: 'manage', load: () => import('./reports') },
  { id: 'staff', label: 'Staff', icon: 'badge', min: 'owner', group: 'manage', load: () => import('./staff') },
  { id: 'settings', label: 'Settings', icon: 'sliders', min: 'cashier', group: 'manage', load: () => import('./settings') },
  { id: 'guide', label: 'How to', icon: 'help', min: 'cashier', group: 'help', load: () => import('./guide') },
];

const roleName: Record<Role, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };

export function mountShell(root: HTMLElement, onSignOut: () => void) {
  const s = auth.session!;
  root.innerHTML = `<div class="shell">
    <aside class="sidebar" aria-label="Main">
      <div class="side-brand" data-brand></div>
      <nav class="side-nav" data-nav></nav>
      <div class="side-user">
        <div class="avatar" aria-hidden="true">${esc((s.full_name || s.username).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())}</div>
        <div class="side-user-text"><b>${esc(s.full_name || s.username)}</b><span>${roleName[s.role]}</span></div>
        <button class="icon-btn on-nav" data-signout aria-label="Sign out" title="Sign out">${icon('logout', 18)}</button>
      </div>
    </aside>
    <div class="workspace">
      <div class="app-banner" data-banner hidden></div>
      <header class="topbar"><div class="topbar-title"><h1 data-title></h1><p data-subtitle></p></div><div class="topbar-actions" data-actions></div></header>
      <main class="view" id="view" tabindex="-1"></main>
    </div>
  </div>`;

  let current = '';
  let main = $<HTMLElement>('#view', root)!;

  const refreshChrome = () => {
    const name = store.settings.business_name || 'My Business';
    const logo = store.settings.business_logo;
    $('[data-brand]', root)!.innerHTML = `${logo ? `<img src="${esc(logo)}" alt="">` : `<img src="/logo-mark.svg" alt="" class="mark-default">`}<div><b>${esc(name)}</b><span>eStock Manager</span></div>`;
    const groups: Array<['sell' | 'manage' | 'help', string]> = [['sell', 'Sell'], ['manage', 'Manage'], ['help', 'Help']];
    $('[data-nav]', root)!.innerHTML = groups.map(([g, label]) => {
      const items = VIEWS.filter((v) => v.group === g && auth.can(v.min) && (!v.when || v.when()));
      if (!items.length) return '';
      return `<div class="nav-group"><span class="nav-label">${label}</span>${items.map((v) => `<button class="nav-item ${v.id === current ? 'is-active' : ''}" data-view="${v.id}" ${v.id === current ? 'aria-current="page"' : ''}>${icon(v.icon, 19)}<span>${v.label}</span>${v.id === 'pos' ? '<kbd>F2</kbd>' : ''}</button>`).join('')}</div>`;
    }).join('');
  };

  const header = (title: string, subtitle = '', actions = '') => {
    $('[data-title]', root)!.textContent = title;
    $('[data-subtitle]', root)!.textContent = subtitle;
    $('[data-actions]', root)!.innerHTML = actions;
  };

  const go = async (id: string, params: Record<string, unknown> = {}) => {
    const def = VIEWS.find((v) => v.id === id && auth.can(v.min) && (!v.when || v.when())) ?? VIEWS[0];
    current = def.id;
    $<HTMLElement>('[data-actions]', root)!.onclick = null;
    refreshChrome();
    header(def.label);
    // A fresh element per page, so listeners from the previous page cannot leak.
    const fresh = document.createElement('main');
    fresh.id = 'view';
    fresh.tabIndex = -1;
    main.replaceWith(fresh);
    main = fresh;
    const page = fresh;
    page.className = `view view-${def.id}`;
    page.innerHTML = '<div class="loading" aria-label="Loading"><span></span><span></span><span></span></div>';
    try {
      const mod = await def.load();
      if (main !== page) return;
      await mod.render({ main: page, params, header, go, refreshChrome });
      if (!document.body.classList.contains('has-modal') && !page.contains(document.activeElement)) page.focus({ preventScroll: true });
    } catch (e) {
      if (main !== page) return;
      page.innerHTML = `<div class="empty"><h3>This page could not load</h3><p>${esc(e instanceof Error ? e.message : String(e))}</p><button class="btn btn-ghost" data-retry>Try again</button></div>`;
      $('[data-retry]', page)?.addEventListener('click', () => go(def.id, params));
    }
  };

  root.addEventListener('click', (e) => {
    const nav = (e.target as HTMLElement).closest<HTMLElement>('[data-view]');
    if (nav && root.contains(nav) && nav.closest('.side-nav')) go(nav.dataset.view!);
    if ((e.target as HTMLElement).closest('[data-signout]')) {
      call('logout').catch(() => undefined).finally(onSignOut);
    }
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'F2' && !document.body.classList.contains('has-modal')) { e.preventDefault(); go('pos'); }
  };
  document.addEventListener('keydown', onKey);

  // Thin strip above the page for the trial countdown and waiting updates.
  const banners = new Map<string, string>();
  const setBanner = (key: string, html: string | null) => {
    if (html) banners.set(key, html); else banners.delete(key);
    const el = $('[data-banner]', root)!;
    el.hidden = !banners.size;
    el.innerHTML = [...banners.values()].map((b) => `<div class="banner-row">${b}</div>`).join('');
  };
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-banner-go]');
    if (b) go(b.dataset.bannerGo!, { section: b.dataset.section });
  });

  go('dashboard');
  return { go, setBanner, dispose: () => document.removeEventListener('keydown', onKey) };
}
