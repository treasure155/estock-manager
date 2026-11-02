import { auth, call } from '../api';
import { esc } from '../lib/dom';
import { greeting, money } from '../lib/format';
import { icon } from '../lib/icons';
import { store } from '../store';
import type { Dashboard } from '../types';
import type { ViewCtx } from './shell';
import { openGroupSheet, visibleGroups } from './shell';

/** Home: today's figures on a card, then the app's sections as tiles. Fits one phone screen. */
export async function render(ctx: ViewCtx) {
  const s = auth.session!;
  const first = (s.full_name || s.username).split(/\s+/)[0];
  ctx.header('Home');
  const d = await call<Dashboard>('dashboard').catch(() => null);
  const mine = d?.scope === 'mine';
  const groups = visibleGroups();
  const alerts = [
    d && d.low_stock_count ? `<button type="button" class="home-alert" data-go="inventory" data-tab="items" data-low="1">${icon('alert', 16)}<span>${d.low_stock_count} running low</span></button>` : '',
    d && (d.expired_count || d.expiring_count) && !mine ? `<button type="button" class="home-alert" data-go="inventory" data-tab="expiry">${icon('calendar', 16)}<span>${d.expired_count ? `${d.expired_count} expired` : `${d.expiring_count} expiring`}</span></button>` : '',
    d && d.ready_collections ? `<button type="button" class="home-alert" data-go="receipts" data-fulfilment="ready">${icon('check', 16)}<span>${d.ready_collections} ready for pickup</span></button>` : '',
  ].filter(Boolean).join('');

  ctx.main.innerHTML = `
    <section class="hero-card">
      <div class="hero-top"><div><span class="hero-hello">${esc(greeting())}, ${esc(first)}</span><b class="hero-biz">${esc(store.settings.business_name || 'My Business')}</b></div>
        <button type="button" class="hero-eye" data-go="dashboard" aria-label="Open overview">${icon('chart', 18)}</button></div>
      <span class="hero-label">${mine ? 'Your sales today' : 'Sales today'}</span>
      <strong class="hero-amount">${d ? money(d.today_sales_kobo) : '—'}</strong>
      <div class="hero-row">
        <div><small>Received</small><b>${d ? money(d.today_collected_kobo, { whole: true }) : '—'}</b></div>
        <div><small>Receipts</small><b>${d ? d.today_receipts : '—'}</b></div>
        <div><small>Owed to you</small><b>${d ? money(d.outstanding_kobo, { whole: true }) : '—'}</b></div>
      </div>
      <div class="hero-actions">
        <button type="button" class="hero-btn primary" data-go="pos">${icon('till', 20)}<span>New sale</span></button>
        <button type="button" class="hero-btn" data-go="receipts">${icon('receipt', 20)}<span>Receipts</span></button>
        ${auth.can('manager') ? `<button type="button" class="hero-btn" data-go="inventory" data-tab="items">${icon('box', 20)}<span>Stock</span></button>` : `<button type="button" class="hero-btn" data-go="shifts">${icon('cash', 20)}<span>Shift</span></button>`}
        <button type="button" class="hero-btn" data-go="customers">${icon('people', 20)}<span>Customers</span></button>
      </div>
    </section>
    ${alerts ? `<div class="home-alerts">${alerts}</div>` : ''}
    <section class="group-grid" aria-label="Sections">
      ${groups.map((g) => `<button type="button" class="group-tile tone-${g.tone}" data-group="${g.id}">
        <span class="group-icon">${icon(g.icon, 24)}</span>
        <span class="group-text"><b>${esc(g.label)}</b><small>${esc(g.hint)}</small></span>
        <span class="group-count">${g.tiles.length}</span>
      </button>`).join('')}
    </section>`;

  ctx.main.onclick = (e) => {
    const t = e.target as HTMLElement;
    const g = t.closest<HTMLElement>('[data-group]');
    if (g) { openGroupSheet(ctx.go, g.dataset.group); return; }
    const b = t.closest<HTMLElement>('[data-go]');
    if (b) ctx.go(b.dataset.go!, { tab: b.dataset.tab, low: b.dataset.low, fulfilment: b.dataset.fulfilment });
  };
}
