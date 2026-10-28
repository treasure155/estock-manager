import { auth, call } from '../api';
import { exportCsv, nairaPlain } from '../lib/csv';
import { $, confirmDialog, debounce, emptyState, esc, modal, toast, withBusy } from '../lib/dom';
import { dateLabel, isoDate, money, nairaInput, relativeDay, toKobo } from '../lib/format';
import { icon } from '../lib/icons';
import { printReceipt, receiptMarkup } from '../lib/receipt';
import { store } from '../store';
import type { Receipt, ReceiptSummary } from '../types';
import type { ViewCtx } from './shell';

const STATUS: Record<string, [string, string]> = {
  paid: ['Paid', 'ok'], partial: ['Part paid', 'warn'], unpaid: ['Owing', 'bad'], void: ['Void', 'mute'],
};
const FULFIL: Record<string, [string, string]> = { pending: ['In progress', 'info'], ready: ['Ready', 'ok'], collected: ['Collected', 'mute'] };

export const statusPill = (s: string) => { const [t, tone] = STATUS[s] ?? [s, 'mute']; return `<span class="pill pill-${tone}">${esc(t)}</span>`; };
export const fulfilPill = (s: string) => { if (s === 'none') return ''; const [t, tone] = FULFIL[s] ?? [s, 'mute']; return `<span class="pill pill-${tone} pill-outline">${esc(t)}</span>`; };

export async function render(ctx: ViewCtx) {
  const collection = store.flag('track_collection');
  const filter = {
    search: '', status: String(ctx.params.status ?? ''), fulfilment: String(ctx.params.fulfilment ?? ''),
    from: '', to: '', customer_id: (ctx.params.customer_id as number | undefined) ?? null,
  };
  ctx.header('Receipts', auth.can('manager') ? 'Every sale, payment and void in one place.' : 'Receipts you have issued.',
    auth.can('manager') ? `<button class="btn btn-ghost" data-export>${icon('download', 16)} Export CSV</button>` : '');

  ctx.main.innerHTML = `
    <div class="toolbar">
      <div class="search-field grow">${icon('search', 16)}<input type="search" data-f="search" placeholder="Receipt number, ${esc(store.label('customer').toLowerCase())} name, phone or email" aria-label="Search receipts"></div>
      <select data-f="status" aria-label="Payment status">
        <option value="">All payments</option><option value="paid">Paid</option><option value="owing">Owing (part or unpaid)</option><option value="void">Void</option>
      </select>
      ${collection ? `<select data-f="fulfilment" aria-label="Pickup status"><option value="">All pickups</option><option value="pending">In progress</option><option value="ready">Ready</option><option value="collected">Collected</option></select>` : ''}
      <label class="date-field"><span>From</span><input type="date" data-f="from"></label>
      <label class="date-field"><span>To</span><input type="date" data-f="to" max="${isoDate(new Date())}"></label>
    </div>
    ${filter.customer_id ? `<p class="filter-note">Showing receipts for one ${esc(store.label('customer').toLowerCase())}. <button class="link-btn" data-clear-customer>Show all</button></p>` : ''}
    <section class="panel flush" data-table></section>`;

  (['status', 'fulfilment'] as const).forEach((k) => { const el = $<HTMLSelectElement>(`[data-f="${k}"]`, ctx.main); if (el) el.value = filter[k]; });
  const table = $('[data-table]', ctx.main)!;
  let rows: ReceiptSummary[] = [];

  const load = async () => {
    rows = await call<ReceiptSummary[]>('list_receipts', { filter });
    const owing = rows.filter((r) => r.payment_status === 'partial' || r.payment_status === 'unpaid').reduce((a, r) => a + r.total_kobo - r.amount_paid_kobo, 0);
    const total = rows.filter((r) => r.payment_status !== 'void').reduce((a, r) => a + r.total_kobo, 0);
    table.innerHTML = rows.length ? `
      <div class="table-meta"><span>${rows.length}${rows.length === 1000 ? '+' : ''} receipt${rows.length === 1 ? '' : 's'}</span><span>Value ${money(total)}</span>${owing ? `<span class="warn-text">Owing ${money(owing)}</span>` : ''}</div>
      <div class="table-scroll"><table class="table table-click">
        <thead><tr><th>Receipt</th><th>When</th><th>${esc(store.label('customer'))}</th>${auth.can('manager') ? '<th>Served by</th>' : ''}<th>Status</th>${collection ? '<th>Pickup</th>' : ''}<th class="num">Total</th><th class="num">Balance</th></tr></thead>
        <tbody>${rows.map((r) => `<tr data-open="${r.id}" tabindex="0">
          <td class="mono-ish">${esc(r.receipt_no)}</td>
          <td>${esc(relativeDay(r.created_at))}</td>
          <td>${esc(r.customer_name || 'Walk-in')}</td>
          ${auth.can('manager') ? `<td>${esc(r.cashier_name)}</td>` : ''}
          <td>${statusPill(r.payment_status)}</td>
          ${collection ? `<td>${fulfilPill(r.fulfilment_status)}${r.collection_date && r.fulfilment_status !== 'collected' ? `<small class="muted block">Due ${esc(dateLabel(r.collection_date))}</small>` : ''}</td>` : ''}
          <td class="num">${money(r.total_kobo)}</td>
          <td class="num">${r.payment_status !== 'void' && r.total_kobo > r.amount_paid_kobo ? `<b class="warn-text">${money(r.total_kobo - r.amount_paid_kobo)}</b>` : '<span class="muted">—</span>'}</td>
        </tr>`).join('')}</tbody></table></div>`
      : emptyState('No receipts found', filter.search || filter.status || filter.from ? 'Try a different search or date range.' : 'Receipts appear here after the first sale.', '<button class="btn btn-primary" data-new-sale>Start a sale</button>');
  };

  const open = async (id: number) => {
    const r = await call<Receipt>('get_receipt', { receiptId: id });
    openReceipt(r, load);
  };

  await load();
  if (ctx.params.open) open(Number(ctx.params.open)).catch((e) => toast(String(e), 'error'));

  const reload = debounce(() => load().catch((e) => toast(String(e), 'error')), 220);
  ctx.main.oninput = (e) => {
    const el = (e.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>('[data-f]');
    if (!el) return;
    (filter as Record<string, unknown>)[el.dataset.f!] = el.value;
    reload();
  };
  ctx.main.onclick = (e) => {
    const t = e.target as HTMLElement;
    const row = t.closest<HTMLElement>('[data-open]');
    if (row) open(Number(row.dataset.open)).catch((x) => toast(String(x), 'error'));
    if (t.closest('[data-new-sale]')) ctx.go('pos');
    if (t.closest('[data-clear-customer]')) ctx.go('receipts');
  };
  ctx.main.onkeydown = (e) => { const row = (e.target as HTMLElement).closest<HTMLElement>('[data-open]'); if (row && e.key === 'Enter') open(Number(row.dataset.open)); };

  $('[data-export]')?.addEventListener('click', () => exportCsv(`receipts-${isoDate(new Date())}.csv`,
    ['Receipt', 'Date', 'Customer', 'Served by', 'Status', 'Pickup', 'Items', 'Total', 'Paid', 'Balance'],
    rows.map((r) => [r.receipt_no, r.created_at, r.customer_name, r.cashier_name, r.payment_status, r.fulfilment_status, r.item_count, nairaPlain(r.total_kobo), nairaPlain(r.amount_paid_kobo), nairaPlain(r.payment_status === 'void' ? 0 : r.total_kobo - r.amount_paid_kobo)])));
}

function openReceipt(r: Receipt, onChange: () => void) {
  const collection = r.fulfilment_status !== 'none' && r.payment_status !== 'void';
  const m = modal({ title: r.receipt_no, subtitle: `${relativeDay(r.created_at)} · ${r.cashier_name}`, size: 'drawer', body: `
    <div class="drawer-status">${statusPill(r.payment_status)} ${fulfilPill(r.fulfilment_status)}</div>
    ${r.balance_kobo > 0 ? `<div class="callout callout-warn"><div><b>${money(r.balance_kobo)} still owed</b><span>${esc(r.customer_name)}${r.customer_phone ? ` · ${esc(r.customer_phone)}` : ''}</span></div><button class="btn btn-primary btn-sm" data-pay>Record payment</button></div>` : ''}
    ${collection ? `<div class="fulfil-row" role="group" aria-label="Pickup status">
      ${(['pending', 'ready', 'collected'] as const).map((s) => `<button class="seg-btn ${r.fulfilment_status === s ? 'is-on' : ''}" data-fulfil="${s}">${FULFIL[s][0]}</button>`).join('')}
    </div>` : ''}
    <div class="paper-wrap">${receiptMarkup(r, { width: '80' })}</div>
    ${r.payments.length > 1 || r.balance_kobo > 0 || r.payments.some((p) => p.created_at.slice(0, 10) !== r.created_at.slice(0, 10)) ? `<h3 class="section-title">Payment history</h3>
      <ul class="history">${r.payments.map((p) => `<li><span>${esc(p.method)}${p.reference ? ` <small class="muted">(${esc(p.reference)})</small>` : ''}<small class="muted block">${esc(relativeDay(p.created_at))} by ${esc(p.received_by || '—')}</small></span><b>${money(p.amount_kobo)}</b></li>`).join('') || '<li class="muted">No payments yet</li>'}</ul>` : ''}
    <div class="drawer-actions">
      <button class="btn btn-primary" data-print>${icon('print', 16)} Print</button>
      <button class="btn btn-ghost" data-email>${icon('mail', 16)} Email</button>
      ${auth.can('manager') && r.payment_status !== 'void' ? `<button class="btn btn-ghost btn-danger-text" data-void>Void receipt</button>` : ''}
    </div>` });

  const refresh = async (next: Receipt) => { m.close(); onChange(); openReceipt(next, onChange); };
  $('[data-print]', m.el)!.addEventListener('click', () => printReceipt(r));
  $('[data-email]', m.el)!.addEventListener('click', () => emailDialog(r, onChange));
  $('[data-pay]', m.el)?.addEventListener('click', () => paymentDialog(r, refresh));
  m.el.querySelectorAll<HTMLButtonElement>('[data-fulfil]').forEach((b) => b.addEventListener('click', () => withBusy(b, async () => {
    const next = await call<Receipt>('update_fulfilment', { receiptId: r.id, status: b.dataset.fulfil });
    toast(`Marked ${FULFIL[b.dataset.fulfil!][0].toLowerCase()}`);
    refresh(next);
  })));
  $('[data-void]', m.el)?.addEventListener('click', async () => {
    const reason = await confirmDialog({ title: `Void ${r.receipt_no}?`, message: 'Stock on this receipt goes back into inventory and the sale is removed from reports. The receipt stays on record, marked void. This cannot be undone.', confirm: 'Void receipt', danger: true, reason: { label: 'Reason', placeholder: 'e.g. customer returned the items', required: true } });
    if (reason === null) return;
    try { const next = await call<Receipt>('void_receipt', { receiptId: r.id, reason }); toast('Receipt voided'); refresh(next); }
    catch (e) { toast(String(e instanceof Error ? e.message : e), 'error'); }
  });
}

function paymentDialog(r: Receipt, done: (r: Receipt) => void) {
  const methods = store.paymentMethods.filter((p) => p.active);
  const m = modal({ title: 'Record payment', subtitle: `${r.receipt_no} · ${r.customer_name}`, size: 'sm', body: `<form class="stack">
    <p class="lead-text">Balance owed: <b>${money(r.balance_kobo)}</b></p>
    <label class="field"><span>Amount received</span><span class="input-affix"><span class="affix">${esc(store.settings.currency_symbol || '₦')}</span><input name="amount" inputmode="decimal" required value="${nairaInput(r.balance_kobo)}" autofocus></span></label>
    <label class="field"><span>Method</span><select name="method">${methods.map((p) => `<option>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Reference <em class="muted">(optional)</em></span><input name="reference" maxlength="80"></label>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Save payment</button></div></form>` });
  const form = m.el.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    withBusy(form.querySelector('.btn-primary'), async () => {
      const next = await call<Receipt>('record_payment', { receiptId: r.id, method: f.get('method'), amountKobo: toKobo(String(f.get('amount'))), reference: String(f.get('reference') || '') });
      toast(next.balance_kobo ? `Payment saved. ${money(next.balance_kobo)} still owed.` : 'Payment saved. Fully paid.');
      m.close(); done(next);
    });
  });
}

function emailDialog(r: Receipt, onChange: () => void) {
  const m = modal({ title: 'Email receipt', subtitle: r.receipt_no, size: 'sm', body: `<form class="stack">
    <label class="field"><span>Send to</span><input type="email" name="to" required maxlength="254" value="${esc(r.customer_email)}" placeholder="customer@example.com" autofocus></label>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">${icon('mail', 16)} Send</button></div></form>` });
  const form = m.el.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy(form.querySelector('.btn-primary'), async () => {
      toast(await call<string>('send_receipt_email', { receiptId: r.id, recipient: (form.elements.namedItem('to') as HTMLInputElement).value }));
      m.close(); onChange();
    });
  });
}
