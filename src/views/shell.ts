import { auth, call } from '../api';
import { $, esc, modal } from '../lib/dom';
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

type Loader = () => Promise<{ render: (ctx: ViewCtx) => Promise<void> | void }>;
export interface ViewDef { id: string; label: string; icon: string; min: Role; when?: () => boolean; load: Loader }

export const VIEWS: ViewDef[] = [
  { id: 'home', label: 'Home', icon: 'home', min: 'cashier', load: () => import('./home') },
  { id: 'dashboard', label: 'Overview', icon: 'chart', min: 'cashier', load: () => import('./dashboard') },
  { id: 'pos', label: 'New sale', icon: 'till', min: 'cashier', load: () => import('./pos') },
  { id: 'receipts', label: 'Receipts', icon: 'receipt', min: 'cashier', load: () => import('./receipts') },
  { id: 'customers', label: 'Customers', icon: 'people', min: 'cashier', load: () => import('./customers') },
  { id: 'shifts', label: 'Shifts & cash-up', icon: 'cash', min: 'cashier', load: () => import('./shifts') },
  { id: 'inventory', label: 'Inventory', icon: 'box', min: 'manager', load: () => import('./inventory') },
  { id: 'purchases', label: 'Purchases', icon: 'truck', min: 'manager', load: () => import('./purchases') },
  { id: 'expenses', label: 'Expenses', icon: 'wallet', min: 'manager', load: () => import('./expenses') },
  { id: 'flocks', label: 'Flocks', icon: 'bird', min: 'cashier', when: () => store.flag('feature_flocks'), load: () => import('./flocks') },
  { id: 'reports', label: 'Reports', icon: 'chart', min: 'manager', load: () => import('./reports') },
  { id: 'staff', label: 'Staff', icon: 'badge', min: 'owner', load: () => import('./staff') },
  { id: 'settings', label: 'Settings', icon: 'sliders', min: 'cashier', load: () => import('./settings') },
  { id: 'guide', label: 'How to', icon: 'help', min: 'cashier', load: () => import('./guide') },
];

/** A tile on the home screen: a page, optionally opened on a given tab or section. */
export interface Tile { label: string; hint: string; icon: string; view: string; params?: Record<string, unknown>; min: Role; when?: () => boolean }
export interface Group { id: string; label: string; hint: string; icon: string; tone: string; tiles: Tile[] }

/** The old sidebar, regrouped. Tapping a group shows its tiles. */
export const GROUPS: Group[] = [
  { id: 'sell', label: 'Sell', hint: 'Till, receipts, customers', icon: 'till', tone: 'orange', tiles: [
    { label: 'New sale', hint: 'Sell and take payment', icon: 'till', view: 'pos', min: 'cashier' },
    { label: 'Receipts', hint: 'Find, reprint, return', icon: 'receipt', view: 'receipts', min: 'cashier' },
    { label: 'Customers', hint: 'Who owes, statements', icon: 'people', view: 'customers', min: 'cashier' },
    { label: 'Shifts & cash-up', hint: 'Open, close, count cash', icon: 'cash', view: 'shifts', min: 'cashier' },
  ] },
  { id: 'stock', label: 'Stock', hint: 'Items, deliveries, expiry', icon: 'box', tone: 'blue', tiles: [
    { label: 'Inventory', hint: 'Items, prices, stock', icon: 'box', view: 'inventory', params: { tab: 'items' }, min: 'manager' },
    { label: 'Receive goods', hint: 'Purchases and suppliers', icon: 'truck', view: 'purchases', min: 'manager' },
    { label: 'Expiry dates', hint: 'Batches running out', icon: 'calendar', view: 'inventory', params: { tab: 'expiry' }, min: 'manager' },
    { label: 'Stock history', hint: 'Every stock change', icon: 'stock', view: 'inventory', params: { tab: 'history' }, min: 'manager' },
    { label: 'Categories', hint: 'Group your items', icon: 'tag', view: 'inventory', params: { tab: 'categories' }, min: 'manager' },
  ] },
  { id: 'money', label: 'Money', hint: 'Reports, profit, expenses', icon: 'chart', tone: 'green', tiles: [
    { label: 'Overview', hint: 'Today and this week', icon: 'home', view: 'dashboard', min: 'cashier' },
    { label: 'Reports', hint: 'Sales and net profit', icon: 'chart', view: 'reports', min: 'manager' },
    { label: 'Expenses', hint: 'Diesel, salaries, rent', icon: 'wallet', view: 'expenses', min: 'manager' },
  ] },
  { id: 'farm', label: 'Farm', hint: 'Broiler flocks', icon: 'bird', tone: 'brown', tiles: [
    { label: 'Flocks', hint: 'Deaths, feed, FCR, profit', icon: 'bird', view: 'flocks', min: 'cashier', when: () => store.flag('feature_flocks') },
  ] },
  { id: 'business', label: 'Business', hint: 'Staff, settings, licence', icon: 'sliders', tone: 'purple', tiles: [
    { label: 'Settings', hint: 'Business, receipts, colours', icon: 'sliders', view: 'settings', min: 'owner' },
    { label: 'Staff', hint: 'Accounts and roles', icon: 'badge', view: 'staff', min: 'owner' },
    { label: 'Licence', hint: 'Activate this device', icon: 'key', view: 'settings', params: { section: 'licence' }, min: 'owner' },
    { label: 'Backup', hint: 'Copies of your data', icon: 'download', view: 'settings', params: { section: 'backup' }, min: 'owner' },
    { label: 'My account', hint: 'Change your password', icon: 'user', view: 'settings', params: { section: 'account' }, min: 'cashier' },
  ] },
  { id: 'help', label: 'Help', hint: 'Guide, about, contact', icon: 'help', tone: 'teal', tiles: [
    { label: 'How to', hint: 'The full user guide', icon: 'help', view: 'guide', min: 'cashier' },
    { label: 'About & contact', hint: 'Version, TechAlpha Hub', icon: 'info', view: 'settings', params: { section: 'about' }, min: 'cashier' },
    { label: 'Updates', hint: 'Get the newest version', icon: 'refresh', view: 'settings', params: { section: 'updates' }, min: 'owner' },
  ] },
];

const allowed = (t: { min: Role; when?: () => boolean }) => auth.can(t.min) && (!t.when || t.when());
export const visibleGroups = () => GROUPS.map((g) => ({ ...g, tiles: g.tiles.filter(allowed) })).filter((g) => g.tiles.length);

const tileHtml = (t: Tile) => `<button type="button" class="subtile" data-tile-view="${t.view}" data-tile-params="${esc(JSON.stringify(t.params ?? {}))}">
  <span class="subtile-icon">${icon(t.icon, 22)}</span><span class="subtile-text"><b>${esc(t.label)}</b><small>${esc(t.hint)}</small></span>${icon('chevron', 16)}</button>`;

/** The tiles of one group (or of every group) in a sheet that slides up. */
export function openGroupSheet(go: ViewCtx['go'], groupId?: string) {
  // Phones: the full menu is the group tiles; each opens its own sheet, so nothing scrolls.
  if (!groupId && matchMedia('(max-width: 760px)').matches) {
    const all = visibleGroups();
    const gm = modal({ title: 'Menu', size: 'md', body: `<div class="group-grid sheet-grid">${all.map((g) => `
      <button type="button" class="group-tile tone-${g.tone}" data-sheet-group="${g.id}">
        <span class="group-icon">${icon(g.icon, 24)}</span>
        <span class="group-text"><b>${esc(g.label)}</b><small>${esc(g.hint)}</small></span>
        <span class="group-count">${g.tiles.length}</span>
      </button>`).join('')}</div>` });
    gm.el.closest('.modal-wrap')?.classList.add('is-sheet');
    gm.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sheet-group]');
      if (!b) return;
      gm.close();
      openGroupSheet(go, b.dataset.sheetGroup);
    });
    return;
  }
  const groups = visibleGroups().filter((g) => !groupId || g.id === groupId);
  const m = modal({ title: groupId ? groups[0]?.label ?? 'Menu' : 'Everything', size: 'md', body: `<div class="sheet-groups">${groups.map((g) => `
    ${groupId ? '' : `<h3 class="sheet-group-title">${esc(g.label)}</h3>`}
    <div class="subtile-grid">${g.tiles.map(tileHtml).join('')}</div>`).join('')}</div>` });
  m.el.closest('.modal-wrap')?.classList.add('is-sheet');
  m.el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tile-view]');
    if (!b) return;
    m.close();
    go(b.dataset.tileView!, JSON.parse(b.dataset.tileParams || '{}'));
  });
}

const roleName: Record<Role, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };

export function mountShell(root: HTMLElement, onSignOut: () => void) {
  const s = auth.session!;
  const initials = esc((s.full_name || s.username).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase());
  root.innerHTML = `<div class="app2">
    <header class="appbar">
      <button type="button" class="appbar-back icon-btn" data-back aria-label="Back">${icon('back', 22)}</button>
      <button type="button" class="appbar-brand" data-go-home aria-label="Home"></button>
      <div class="appbar-title"><h1 data-title></h1><p data-subtitle></p></div>
      <nav class="appbar-quick" aria-label="Quick">
        <button type="button" class="quick-btn" data-quick="home">${icon('home', 18)}<span>Home</span></button>
        <button type="button" class="quick-btn" data-quick="pos">${icon('till', 18)}<span>New sale</span><kbd>F2</kbd></button>
        <button type="button" class="quick-btn" data-quick="receipts">${icon('receipt', 18)}<span>Receipts</span></button>
        <button type="button" class="quick-btn" data-quick="menu">${icon('grid', 18)}<span>Menu</span></button>
      </nav>
      <button type="button" class="appbar-avatar" data-account aria-label="Account">${initials}</button>
    </header>
    <div class="app-banner" data-banner hidden></div>
    <div class="page-actions" data-actions></div>
    <main class="view" id="view" tabindex="-1"></main>
    <nav class="tabbar" aria-label="Main">
      <button type="button" data-quick="home">${icon('home', 22)}<span>Home</span></button>
      <button type="button" data-quick="pos">${icon('till', 22)}<span>Sell</span></button>
      <button type="button" data-quick="receipts">${icon('receipt', 22)}<span>Receipts</span></button>
      <button type="button" data-quick="customers">${icon('people', 22)}<span>Customers</span></button>
      <button type="button" data-quick="menu">${icon('grid', 22)}<span>Menu</span></button>
    </nav>
  </div>`;
  const app = $('.app2', root)!;

  let current = '';
  let main = $<HTMLElement>('#view', root)!;
  // Pages visited, so Back (and the phone's back button) return to the previous page.
  const trail: Array<{ id: string; params: Record<string, unknown> }> = [];

  const refreshChrome = () => {
    const name = store.settings.business_name || 'My Business';
    const logo = store.settings.business_logo;
    $('[data-go-home]', root)!.innerHTML = `<img src="${esc(logo || '/logo-mark.svg')}" alt=""><span><b>${esc(name)}</b><small>eStock Manager</small></span>`;
    app.classList.toggle('is-home', current === 'home');
    root.querySelectorAll<HTMLElement>('[data-quick]').forEach((b) => b.classList.toggle('is-on', b.dataset.quick === current));
  };

  const header = (title: string, subtitle = '', actions = '') => {
    $('[data-title]', root)!.textContent = title;
    $('[data-subtitle]', root)!.textContent = subtitle;
    const a = $('[data-actions]', root)!;
    a.innerHTML = actions;
    a.hidden = !actions.trim();
  };

  const render = async (id: string, params: Record<string, unknown>) => {
    const def = VIEWS.find((v) => v.id === id && auth.can(v.min) && (!v.when || v.when())) ?? VIEWS[0];
    current = def.id;
    $<HTMLElement>('[data-actions]', root)!.onclick = null;
    header(def.label);
    refreshChrome();
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
      const msg = e instanceof Error ? `${e.message}` : String(e);
      page.innerHTML = `<div class="empty"><h3>This page could not open</h3><p>${esc(msg)}</p>
        <div class="row-actions"><button class="btn btn-primary" data-retry>Try again</button><button class="btn btn-ghost" data-home2>Go home</button></div></div>`;
      $('[data-retry]', page)?.addEventListener('click', () => render(def.id, params));
      $('[data-home2]', page)?.addEventListener('click', () => go('home'));
    }
  };

  function go(id: string, params: Record<string, unknown> = {}) {
    if (id === 'home') trail.length = 0;
    trail.push({ id, params });
    try { history.pushState({ estock: trail.length }, ''); } catch { /* not available */ }
    void render(id, params);
  }

  const back = () => {
    if (trail.length <= 1) { if (current !== 'home') go('home'); return; }
    trail.pop();
    const prev = trail[trail.length - 1];
    void render(prev.id, prev.params);
  };

  // Phone back button: close an open pop-up first, otherwise go to the previous page.
  const onPop = () => {
    const open = document.querySelectorAll('.modal-wrap');
    if (open.length) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      try { history.pushState({ estock: trail.length }, ''); } catch { /* ignore */ }
      return;
    }
    if (current === 'home' && trail.length <= 1) return; // the next Back leaves the app
    back();
    try { history.pushState({ estock: trail.length }, ''); } catch { /* ignore */ }
  };
  window.addEventListener('popstate', onPop);

  const accountSheet = () => {
    const m = modal({ title: s.full_name || s.username, subtitle: `${roleName[s.role]} · ${store.settings.business_name || ''}`, size: 'sm', body: `<div class="subtile-grid one">
      <button type="button" class="subtile" data-acc="account"><span class="subtile-icon">${icon('user', 22)}</span><span class="subtile-text"><b>My account</b><small>Change your password</small></span>${icon('chevron', 16)}</button>
      <button type="button" class="subtile" data-acc="about"><span class="subtile-icon">${icon('info', 22)}</span><span class="subtile-text"><b>About & contact</b><small>Version and TechAlpha Hub</small></span>${icon('chevron', 16)}</button>
      <button type="button" class="subtile danger" data-acc="signout"><span class="subtile-icon">${icon('logout', 22)}</span><span class="subtile-text"><b>Sign out</b><small>Let someone else sign in</small></span></button>
    </div>` });
    m.el.closest('.modal-wrap')?.classList.add('is-sheet');
    m.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-acc]');
      if (!b) return;
      m.close();
      if (b.dataset.acc === 'signout') call('logout').catch(() => undefined).finally(onSignOut);
      else go('settings', { section: b.dataset.acc });
    });
  };

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-back]')) { back(); return; }
    if (t.closest('[data-go-home]')) { go('home'); return; }
    if (t.closest('[data-account]')) { accountSheet(); return; }
    const q = t.closest<HTMLElement>('[data-quick]');
    if (q) { if (q.dataset.quick === 'menu') openGroupSheet(go); else go(q.dataset.quick!); return; }
    const b = t.closest<HTMLElement>('[data-banner-go]');
    if (b) go(b.dataset.bannerGo!, { section: b.dataset.section });
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

  go('home');
  return { go, setBanner, dispose: () => { document.removeEventListener('keydown', onKey); window.removeEventListener('popstate', onPop); } };
}
