import { auth, call } from '../api';
import { exportCsv, nairaPlain } from '../lib/csv';
import { $, confirmDialog, debounce, emptyState, errText, esc, formValues, modal, toast, withBusy } from '../lib/dom';
import { isoDate, money } from '../lib/format';
import { icon } from '../lib/icons';
import { store } from '../store';
import type { Customer } from '../types';
import type { ViewCtx } from './shell';

export async function render(ctx: ViewCtx) {
  const label = store.label('customer');
  const plural = `${label}s`;
  ctx.header(plural, `Saved ${plural.toLowerCase()}, what they have bought and what they owe.`, `
    ${auth.can('manager') ? `<button class="btn btn-ghost" data-export>${icon('download', 16)} Export</button>` : ''}
    <button class="btn btn-primary" data-new>${icon('plus', 16)} Add ${esc(label.toLowerCase())}</button>`);
  ctx.main.innerHTML = `<div class="toolbar">
      <div class="search-field grow">${icon('search', 16)}<input type="search" data-search placeholder="Name, phone or email" aria-label="Search ${esc(plural.toLowerCase())}"></div>
      <label class="check inline"><input type="checkbox" data-owing><span>Only those who owe</span></label>
    </div><section class="panel flush" data-list></section>`;
  let rows: Customer[] = [];
  let owingOnly = false;
  const list = $('[data-list]', ctx.main)!;
  const load = async (q = '') => {
    rows = await call<Customer[]>('list_customers', { search: q });
    const shown = owingOnly ? rows.filter((c) => c.balance_kobo > 0) : rows;
    const owed = rows.reduce((a, c) => a + c.balance_kobo, 0);
    list.innerHTML = shown.length ? `<div class="table-meta"><span>${shown.length} ${shown.length === 1 ? esc(label.toLowerCase()) : esc(plural.toLowerCase())}</span>${owed ? `<span class="warn-text">Total owed ${money(owed)}</span>` : ''}</div>
      <div class="table-scroll"><table class="table">
      <thead><tr><th>Name</th><th>Contact</th><th class="num">Receipts</th><th class="num">Total bought</th><th class="num">Owes</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${shown.map((c) => `<tr>
        <td><b>${esc(c.name)}</b>${c.address ? `<small class="muted block">${esc(c.address)}</small>` : ''}</td>
        <td>${esc(c.phone || '')}${c.email ? `<small class="muted block">${esc(c.email)}</small>` : ''}${!c.phone && !c.email ? '<span class="muted">—</span>' : ''}</td>
        <td class="num">${c.receipt_count}</td>
        <td class="num">${money(c.total_spent_kobo)}</td>
        <td class="num">${c.balance_kobo > 0 ? `<b class="warn-text">${money(c.balance_kobo)}</b>` : '<span class="muted">—</span>'}</td>
        <td class="actions-col">
          <button class="btn btn-ghost btn-sm" data-receipts="${c.id}">Receipts</button>
          ${auth.can('manager') ? `<button class="icon-btn" data-edit="${c.id}" aria-label="Edit ${esc(c.name)}">${icon('edit', 16)}</button>` : ''}
        </td></tr>`).join('')}</tbody></table></div>`
      : emptyState(rows.length ? 'Nobody owes you' : `No ${plural.toLowerCase()} yet`, rows.length ? 'Every saved customer is fully paid up.' : `Add ${plural.toLowerCase()} here or while making a sale. Credit sales need a named ${label.toLowerCase()}.`);
  };
  await load();
  const search = $<HTMLInputElement>('[data-search]', ctx.main)!;
  search.addEventListener('input', debounce(() => load(search.value).catch((e) => toast(errText(e), 'error')), 200));
  $<HTMLInputElement>('[data-owing]', ctx.main)!.addEventListener('change', (e) => { owingOnly = (e.target as HTMLInputElement).checked; load(search.value); });
  ctx.main.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const r = t.closest<HTMLElement>('[data-receipts]');
    if (r) ctx.go('receipts', { customer_id: Number(r.dataset.receipts) });
    const ed = t.closest<HTMLElement>('[data-edit]');
    if (ed) customerForm(rows.find((c) => c.id === Number(ed.dataset.edit))!, () => load(search.value));
  });
  $('[data-new]')!.addEventListener('click', () => customerForm(null, () => load(search.value)));
  $('[data-export]')?.addEventListener('click', () => exportCsv(`${plural.toLowerCase()}-${isoDate(new Date())}.csv`, ['Name', 'Phone', 'Email', 'Address', 'Notes', 'Receipts', 'Total bought', 'Owes'],
    rows.map((c) => [c.name, c.phone, c.email, c.address, c.notes, c.receipt_count, nairaPlain(c.total_spent_kobo), nairaPlain(c.balance_kobo)])));
}

function customerForm(c: Customer | null, done: () => void) {
  const label = store.label('customer');
  const m = modal({ title: c ? `Edit ${c.name}` : `Add ${label.toLowerCase()}`, size: 'md', body: `<form class="stack">
    <label class="field"><span>Name</span><input name="name" required maxlength="120" value="${esc(c?.name ?? '')}" autofocus></label>
    <div class="grid-2"><label class="field"><span>Phone</span><input name="phone" maxlength="40" inputmode="tel" value="${esc(c?.phone ?? '')}"></label>
    <label class="field"><span>Email</span><input name="email" type="email" maxlength="254" value="${esc(c?.email ?? '')}"></label></div>
    <label class="field"><span>Address</span><input name="address" maxlength="300" value="${esc(c?.address ?? '')}"></label>
    <label class="field"><span>Notes</span><textarea name="notes" rows="2" maxlength="500">${esc(c?.notes ?? '')}</textarea></label>
    <p class="form-error" role="alert" data-err></p>
    <div class="form-actions">${c ? `<button type="button" class="btn btn-ghost btn-danger-text push-left" data-del>${icon('trash', 16)} Delete</button>` : ''}<button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Save</button></div></form>` });
  const form = m.el.querySelector('form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    withBusy($<HTMLButtonElement>('.btn-primary', form), async () => {
      try { await call('save_customer', { input: { id: c?.id ?? null, name: v.name, phone: v.phone, email: v.email, address: v.address, notes: v.notes } }); }
      catch (x) { $('[data-err]', form)!.textContent = errText(x); return; }
      toast(`${v.name} saved`); m.close(); done();
    });
  });
  $('[data-del]', form)?.addEventListener('click', async () => {
    if (await confirmDialog({ title: `Delete ${c!.name}?`, message: 'Their old receipts keep the name as it was written at the time of sale.', confirm: 'Delete', danger: true }) === null) return;
    try { await call('delete_customer', { id: c!.id }); toast('Deleted'); m.close(); done(); } catch (x) { toast(errText(x), 'error'); }
  });
}
