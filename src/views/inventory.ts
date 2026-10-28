import { call } from '../api';
import { exportCsv, nairaPlain } from '../lib/csv';
import { $, $$, confirmDialog, debounce, emptyState, errText, esc, formValues, modal, toast, withBusy } from '../lib/dom';
import { isoDate, money, nairaInput, qty, relativeDay, toKobo } from '../lib/format';
import { icon } from '../lib/icons';
import { store } from '../store';
import type { Kind, Movement, Product } from '../types';
import type { ViewCtx } from './shell';

const KIND_LABEL: Record<Kind, string> = { product: 'For sale', service: 'Service', material: 'Internal use' };
const MOVE_LABEL: Record<string, string> = { opening: 'Opening stock', stock_in: 'Received', stock_out: 'Removed', adjustment: 'Count correction', sale: 'Sold', void_reversal: 'Returned (void)' };

type Tab = 'items' | 'categories' | 'history';
let tab: Tab = 'items';
const f = { search: '', category: '', kind: '', low: false, archived: false };

export async function render(ctx: ViewCtx) {
  if (ctx.params.low) { f.low = true; tab = 'items'; }
  ctx.header('Inventory', `${store.label('items')}, services and the stock you keep.`, `
    <button class="btn btn-ghost" data-export>${icon('download', 16)} Export</button>
    <button class="btn btn-primary" data-new>${icon('plus', 16)} Add ${esc(store.label('item').toLowerCase())}</button>`);
  ctx.main.innerHTML = `
    <div class="tabs" role="tablist">
      ${(['items', 'categories', 'history'] as Tab[]).map((t) => `<button role="tab" class="tab ${tab === t ? 'is-on' : ''}" aria-selected="${tab === t}" data-tab="${t}">${{ items: store.label('items'), categories: 'Categories', history: 'Stock history' }[t]}</button>`).join('')}
    </div>
    <div data-pane></div>`;
  const pane = $('[data-pane]', ctx.main)!;

  const show = async () => {
    $$('[data-tab]', ctx.main).forEach((b) => { b.classList.toggle('is-on', b.dataset.tab === tab); b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
    if (tab === 'items') await itemsPane(pane);
    if (tab === 'categories') await categoriesPane(pane);
    if (tab === 'history') await historyPane(pane);
  };
  ctx.main.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
    if (b) { tab = b.dataset.tab as Tab; show().catch((x) => toast(errText(x), 'error')); }
  });
  $('[data-new]')!.addEventListener('click', () => itemForm(null, () => show()));
  $('[data-export]')!.addEventListener('click', async () => {
    await store.loadProducts(true);
    exportCsv(`inventory-${isoDate(new Date())}.csv`, ['Code', 'Barcode', 'Name', 'Category', 'Type', 'Unit', 'Selling price', 'Cost price', 'Tracks stock', 'In stock', 'Reorder level', 'Stock value (cost)', 'Active'],
      store.products.map((p) => [p.sku, p.barcode, p.name, p.category_name, KIND_LABEL[p.kind], p.unit, nairaPlain(p.selling_price_kobo), nairaPlain(p.cost_price_kobo), p.track_stock ? 'Yes' : 'No', p.stock_qty, p.reorder_level, nairaPlain(Math.round(p.stock_qty * p.cost_price_kobo)), p.active ? 'Yes' : 'No']));
  });
  await Promise.all([store.loadCategories(), store.loadTemplates()]);
  await show();
}

// ---------------------------------------------------------------- items

async function itemsPane(pane: HTMLElement) {
  await store.loadProducts(true);
  pane.innerHTML = `
    <div class="figures" data-figures></div>
    <div class="toolbar">
      <div class="search-field grow">${icon('search', 16)}<input type="search" data-f="search" value="${esc(f.search)}" placeholder="Name, code or barcode" aria-label="Search inventory"></div>
      <select data-f="category" aria-label="Category"><option value="">All categories</option>${store.categories.map((c) => `<option value="${c.id}" ${f.category === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="none" ${f.category === 'none' ? 'selected' : ''}>Uncategorised</option></select>
      <select data-f="kind" aria-label="Type"><option value="">All types</option>${(Object.keys(KIND_LABEL) as Kind[]).map((k) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${KIND_LABEL[k]}</option>`).join('')}</select>
      <label class="check inline"><input type="checkbox" data-f="low" ${f.low ? 'checked' : ''}><span>Running low</span></label>
      <label class="check inline"><input type="checkbox" data-f="archived" ${f.archived ? 'checked' : ''}><span>Show archived</span></label>
    </div>
    <section class="panel flush" data-list></section>`;
  const list = $('[data-list]', pane)!;

  const draw = () => {
    const q = f.search.trim().toLowerCase();
    const rows = store.products.filter((p) =>
      (f.archived || p.active) &&
      (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)) &&
      (!f.category || (f.category === 'none' ? !p.category_id : String(p.category_id) === f.category)) &&
      (!f.kind || p.kind === f.kind) &&
      (!f.low || (p.track_stock && p.stock_qty <= p.reorder_level)));
    const active = store.products.filter((p) => p.active);
    const tracked = active.filter((p) => p.track_stock);
    const atCost = tracked.reduce((a, p) => a + Math.round(Math.max(0, p.stock_qty) * p.cost_price_kobo), 0);
    const atPrice = tracked.filter((p) => p.kind === 'product').reduce((a, p) => a + Math.round(Math.max(0, p.stock_qty) * p.selling_price_kobo), 0);
    const low = tracked.filter((p) => p.stock_qty <= p.reorder_level).length;
    $('[data-figures]', pane)!.innerHTML = `
      <div><span>${esc(store.label('items'))} and services</span><b>${active.length}</b></div>
      <div><span>Stock value at cost</span><b>${money(atCost)}</b></div>
      <div><span>Stock value at selling price</span><b>${money(atPrice)}</b></div>
      <div><span>Running low</span><b class="${low ? 'warn-text' : ''}">${low}</b></div>`;
    list.innerHTML = rows.length ? `<div class="table-scroll"><table class="table">
      <thead><tr><th>${esc(store.label('item'))}</th><th>Category</th><th>Type</th><th class="num">Selling price</th><th class="num">Cost</th><th class="num">In stock</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${rows.map((p) => {
        const low = p.track_stock && p.stock_qty <= p.reorder_level;
        return `<tr class="${p.active ? '' : 'is-archived'}">
          <td><b>${esc(p.name)}</b><small class="muted block">${esc(p.sku)}${p.barcode ? ` · ${esc(p.barcode)}` : ''}${p.active ? '' : ' · Archived'}</small></td>
          <td>${esc(p.category_name || '—')}</td>
          <td><span class="kind kind-${p.kind}">${KIND_LABEL[p.kind]}</span></td>
          <td class="num">${p.kind === 'material' ? '<span class="muted">—</span>' : money(p.selling_price_kobo)}<small class="muted block">per ${esc(p.unit)}</small></td>
          <td class="num">${money(p.cost_price_kobo)}</td>
          <td class="num">${p.track_stock ? `<b class="${p.stock_qty <= 0 ? 'bad-text' : low ? 'warn-text' : ''}">${qty(p.stock_qty)}</b> <small class="muted">${esc(p.unit)}</small>${low ? `<small class="block warn-text">Reorder at ${qty(p.reorder_level)}</small>` : ''}` : '<span class="muted">Not tracked</span>'}</td>
          <td class="actions-col">
            ${p.track_stock && p.active ? `<button class="btn btn-ghost btn-sm" data-stock="${p.id}">${icon('stock', 15)} Stock</button>` : ''}
            <button class="icon-btn" data-edit="${p.id}" aria-label="Edit ${esc(p.name)}">${icon('edit', 16)}</button>
          </td></tr>`;
      }).join('')}</tbody></table></div>`
      : store.products.length ? emptyState('Nothing matches', 'Clear the filters or try another search.')
      : emptyState(`No ${store.label('items').toLowerCase()} yet`, 'Add what you sell and the stock you keep. You can also load sample items for your business type in Settings.', `<button class="btn btn-primary" data-new-inline>${icon('plus', 16)} Add ${esc(store.label('item').toLowerCase())}</button>`);
  };
  draw();

  const redraw = debounce(draw, 120);
  pane.oninput = (e) => {
    const el = (e.target as HTMLElement).closest<HTMLInputElement>('[data-f]');
    if (!el) return;
    const k = el.dataset.f as keyof typeof f;
    (f as Record<string, unknown>)[k] = el.type === 'checkbox' ? el.checked : el.value;
    redraw();
  };
  pane.onclick = (e) => {
    const t = e.target as HTMLElement;
    const reload = async () => { await store.loadProducts(true); draw(); };
    const edit = t.closest<HTMLElement>('[data-edit]');
    if (edit) itemForm(store.products.find((p) => p.id === Number(edit.dataset.edit))!, reload);
    const st = t.closest<HTMLElement>('[data-stock]');
    if (st) stockForm(store.products.find((p) => p.id === Number(st.dataset.stock))!, reload);
    if (t.closest('[data-new-inline]')) itemForm(null, reload);
  };
}

function nextSku(): string {
  const prefix = (store.settings.receipt_prefix || 'ITM').slice(0, 3).toUpperCase();
  const nums = store.products.map((p) => p.sku.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'))?.[1]).filter(Boolean).map(Number);
  return `${prefix}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

/** Add/edit form. `prefill.barcode` is used when an unknown barcode is scanned at the till. */
export function itemForm(p: Product | null, done: (id?: number) => void | Promise<void>, prefill: { barcode?: string } = {}) {
  const isNew = !p;
  const item = p ?? { id: 0, sku: nextSku(), barcode: prefill.barcode ?? '', name: '', category_id: null, category_name: '', kind: 'product' as Kind, unit: 'piece', selling_price_kobo: 0, cost_price_kobo: 0, track_stock: true, stock_qty: 0, reorder_level: 0, description: '', active: true };
  const cur = esc(store.settings.currency_symbol || '₦');
  const m = modal({ title: isNew ? `Add ${store.label('item').toLowerCase()}` : `Edit ${item.name}`, size: 'lg', body: `<form class="stack" novalidate>
    <div class="field"><span>What is it?</span>
      <div class="seg seg-wide" role="radiogroup" aria-label="Type">
        ${(Object.keys(KIND_LABEL) as Kind[]).map((k) => `<label><input type="radio" name="kind" value="${k}" ${item.kind === k ? 'checked' : ''}><span><b>${KIND_LABEL[k]}</b><small>${{ product: 'Goods, meals, birds or produce you sell', service: 'Work you charge for, no stock', material: 'Stock you use but do not sell' }[k]}</small></span></label>`).join('')}
      </div>
    </div>
    <div class="grid-3">
      <label class="field span-2"><span>Name</span><input name="name" required maxlength="120" value="${esc(item.name)}" autofocus></label>
      <label class="field"><span>Code (SKU)</span><input name="sku" required maxlength="40" value="${esc(item.sku)}" spellcheck="false"></label>
    </div>
    <div class="grid-3">
      <label class="field"><span>Category</span><select name="category_id"><option value="">No category</option>${store.categories.map((c) => `<option value="${c.id}" ${item.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Sold or counted per</span><input name="unit" required maxlength="24" list="unit-list" value="${esc(item.unit)}"><datalist id="unit-list">${store.units().map((u) => `<option value="${esc(u)}">`).join('')}</datalist></label>
      <label class="field"><span>Barcode <em class="muted">(optional)</em></span><input name="barcode" maxlength="64" value="${esc(item.barcode)}" placeholder="Scan into this box" spellcheck="false"></label>
    </div>
    <div class="grid-3">
      <label class="field" data-sell><span>Selling price</span><span class="input-affix"><span class="affix">${cur}</span><input name="selling_price" inputmode="decimal" value="${nairaInput(item.selling_price_kobo)}"></span></label>
      <label class="field"><span>Cost price</span><span class="input-affix"><span class="affix">${cur}</span><input name="cost_price" inputmode="decimal" value="${nairaInput(item.cost_price_kobo)}"></span><small>What you pay or spend per unit. Used for profit.</small></label>
      <div class="field" data-margin><span>Margin</span><output class="margin-out"></output></div>
    </div>
    <fieldset class="subtle stack" data-stockbox>
      <label class="check"><input type="checkbox" name="track_stock" ${item.track_stock ? 'checked' : ''}><span><b>Track stock for this ${esc(store.label('item').toLowerCase())}</b><br><small class="muted">Sales reduce the count. Turn off for things you never run out of.</small></span></label>
      <div class="grid-3" data-stockfields>
        ${isNew ? `<label class="field"><span>Opening stock</span><input name="stock_qty" inputmode="decimal" value="0"></label>` : `<div class="field"><span>In stock now</span><output>${qty(item.stock_qty)} ${esc(item.unit)}</output><small>Change it with the Stock button.</small></div>`}
        <label class="field"><span>Reorder level</span><input name="reorder_level" inputmode="decimal" value="${qty(item.reorder_level)}"><small>Warn me when stock falls to this.</small></label>
      </div>
    </fieldset>
    <label class="field"><span>Description <em class="muted">(optional)</em></span><textarea name="description" rows="2" maxlength="500">${esc(item.description)}</textarea></label>
    ${!isNew ? `<label class="check"><input type="checkbox" name="active" ${item.active ? 'checked' : ''}><span>Active <small class="muted">— archived items are hidden from the till but kept on old receipts</small></span></label>` : ''}
    <p class="form-error" role="alert" data-err></p>
    <div class="form-actions">
      ${!isNew ? `<button type="button" class="btn btn-ghost btn-danger-text push-left" data-remove>${icon('trash', 16)} Delete</button>` : ''}
      <button type="button" class="btn btn-ghost" data-close>Cancel</button>
      ${isNew ? '<button type="submit" class="btn btn-ghost" data-again>Save and add another</button>' : ''}
      <button type="submit" class="btn btn-primary">Save</button>
    </div></form>` });
  const form = m.el.querySelector('form')!;
  const sync = () => {
    const kind = (form.querySelector('input[name=kind]:checked') as HTMLInputElement).value as Kind;
    $('[data-sell]', form)!.hidden = kind === 'material';
    $('[data-margin]', form)!.hidden = kind === 'material';
    $('[data-stockbox]', form)!.hidden = kind === 'service';
    const track = (form.elements.namedItem('track_stock') as HTMLInputElement).checked;
    $('[data-stockfields]', form)!.hidden = !track;
    const sp = toKobo((form.elements.namedItem('selling_price') as HTMLInputElement).value);
    const cp = toKobo((form.elements.namedItem('cost_price') as HTMLInputElement).value);
    $('.margin-out', form)!.textContent = sp && cp ? `${money(sp - cp)} (${Math.round(((sp - cp) / sp) * 100)}%)` : '—';
  };
  sync();
  form.addEventListener('input', sync);
  let again = false;
  $('[data-again]', form)?.addEventListener('click', () => { again = true; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    const err = $('[data-err]', form)!;
    err.textContent = '';
    const kind = v.kind as Kind;
    if (!v.name.trim()) { err.textContent = 'Enter a name.'; return; }
    const sell = kind === 'material' ? 0 : toKobo(v.selling_price);
    if (kind !== 'material' && sell <= 0) { err.textContent = 'Enter a selling price.'; return; }
    const input = {
      id: isNew ? null : item.id, sku: v.sku.trim(), barcode: v.barcode.trim(), name: v.name.trim(), category_id: v.category_id ? Number(v.category_id) : null,
      kind, unit: v.unit.trim(), selling_price_kobo: sell, cost_price_kobo: toKobo(v.cost_price), track_stock: kind !== 'service' && v.track_stock === '1',
      stock_qty: isNew ? Number(v.stock_qty || 0) : item.stock_qty, reorder_level: Number(v.reorder_level || 0), description: v.description ?? '', active: isNew ? true : v.active === '1',
    };
    if (!Number.isFinite(input.stock_qty) || input.stock_qty < 0 || !Number.isFinite(input.reorder_level) || input.reorder_level < 0) { err.textContent = 'Stock numbers must be zero or more.'; return; }
    const btn = again ? $<HTMLButtonElement>('[data-again]', form) : $<HTMLButtonElement>('.btn-primary', form);
    withBusy(btn, async () => {
      let id: number;
      try {
        id = await call<number>('save_product', { input });
      } catch (x) { err.textContent = errText(x); again = false; return; }
      toast(`${input.name} saved`);
      m.close();
      await done(id);
      if (again) { await store.loadProducts(true); itemForm(null, done); }
    });
  });
  $('[data-remove]', form)?.addEventListener('click', async () => {
    if (await confirmDialog({ title: `Delete ${item.name}?`, message: 'If it has been sold before, it is archived instead so old receipts stay correct.', confirm: 'Delete', danger: true }) === null) return;
    try {
      const how = await call<string>('remove_product', { productId: item.id });
      toast(how === 'archived' ? `${item.name} archived` : `${item.name} deleted`);
      m.close(); done();
    } catch (x) { toast(errText(x), 'error'); }
  });
}

function stockForm(p: Product, done: () => void) {
  const cur = esc(store.settings.currency_symbol || '₦');
  const reasons = store.settings.business_type === 'broiler_farm' ? ['Mortality', 'Used on farm', 'Damaged', 'Given out'] :
    store.settings.business_type === 'eatery' ? ['Used in kitchen', 'Spoilt', 'Staff meal', 'Damaged'] :
    store.settings.business_type === 'dry_cleaning' ? ['Used in cleaning', 'Damaged', 'Expired'] : ['Damaged', 'Expired', 'Used internally', 'Stolen or missing'];
  const m = modal({ title: `Stock: ${p.name}`, subtitle: `${qty(p.stock_qty)} ${p.unit} in stock now`, size: 'md', body: `<form class="stack">
    <div class="seg seg-wide" role="radiogroup" aria-label="Stock action">
      <label><input type="radio" name="mode" value="stock_in" checked><span><b>Receive</b><small>New stock arrived</small></span></label>
      <label><input type="radio" name="mode" value="stock_out"><span><b>Remove</b><small>Damaged, used or lost</small></span></label>
      <label><input type="radio" name="mode" value="count"><span><b>Count</b><small>Set the exact amount</small></span></label>
    </div>
    <div class="grid-2">
      <label class="field"><span data-qlabel>Quantity received</span><span class="input-affix"><input name="quantity" inputmode="decimal" required autofocus><span class="affix">${esc(p.unit)}</span></span></label>
      <label class="field" data-costbox><span>Cost per ${esc(p.unit)} <em class="muted">(optional)</em></span><span class="input-affix"><span class="affix">${cur}</span><input name="unit_cost" inputmode="decimal" placeholder="${nairaInput(p.cost_price_kobo)}"></span><small>Updates the average cost.</small></label>
    </div>
    <label class="field"><span data-nlabel>Note <em class="muted">(optional)</em></span><input name="note" maxlength="200" list="reason-list" placeholder="e.g. supplier invoice no."><datalist id="reason-list">${reasons.map((r) => `<option value="${esc(r)}">`).join('')}</datalist></label>
    <p class="muted small" data-preview></p>
    <p class="form-error" role="alert" data-err></p>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary">Save stock change</button></div>
  </form>` });
  const form = m.el.querySelector('form')!;
  const sync = () => {
    const mode = (form.querySelector('input[name=mode]:checked') as HTMLInputElement).value;
    const q = Number((form.elements.namedItem('quantity') as HTMLInputElement).value || 0);
    $('[data-qlabel]', form)!.textContent = { stock_in: 'Quantity received', stock_out: 'Quantity removed', count: 'Quantity counted' }[mode]!;
    $('[data-costbox]', form)!.hidden = mode !== 'stock_in';
    $('[data-nlabel]', form)!.innerHTML = mode === 'stock_out' ? 'Reason' : 'Note <em class="muted">(optional)</em>';
    (form.elements.namedItem('note') as HTMLInputElement).placeholder = mode === 'stock_out' ? reasons.join(', ') : 'e.g. supplier invoice no.';
    const after = mode === 'stock_in' ? p.stock_qty + q : mode === 'stock_out' ? p.stock_qty - q : q;
    $('[data-preview]', form)!.textContent = q || mode === 'count' ? `Stock after this: ${qty(after)} ${p.unit}` : '';
  };
  sync();
  form.addEventListener('input', sync);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formValues(form);
    const err = $('[data-err]', form)!;
    withBusy($<HTMLButtonElement>('.btn-primary', form), async () => {
      try {
        const q = await call<number>('adjust_stock', { input: { product_id: p.id, mode: v.mode, quantity: Number(v.quantity), unit_cost_kobo: v.unit_cost ? toKobo(v.unit_cost) : null, note: v.note } });
        toast(`${p.name}: ${qty(q)} ${p.unit} in stock`);
        m.close(); done();
      } catch (x) { err.textContent = errText(x); }
    });
  });
}

// ---------------------------------------------------------------- categories

async function categoriesPane(pane: HTMLElement) {
  await store.loadCategories();
  pane.innerHTML = `<section class="panel narrow">
    <header class="panel-head"><div><h2>Categories</h2><p class="muted small">Group ${esc(store.label('items').toLowerCase())} on the till and in reports. Lower numbers show first.</p></div></header>
    <form class="inline-form" data-add>
      <input name="name" maxlength="60" required placeholder="New category name" aria-label="New category name">
      <input name="sort" type="number" min="0" max="9999" value="${store.categories.length + 1}" aria-label="Order" class="w-num">
      <button class="btn btn-primary">${icon('plus', 16)} Add</button>
    </form>
    ${store.categories.length ? `<ul class="cat-list">${store.categories.map((c) => `<li data-id="${c.id}">
      <input value="${esc(c.name)}" maxlength="60" data-name aria-label="Category name">
      <input type="number" class="w-num" value="${c.sort_order}" data-sort aria-label="Order">
      <span class="muted small">${c.item_count} ${c.item_count === 1 ? 'item' : 'items'}</span>
      <button class="btn btn-ghost btn-sm" data-save>Save</button>
      <button class="icon-btn" data-del aria-label="Delete ${esc(c.name)}">${icon('trash', 16)}</button>
    </li>`).join('')}</ul>` : '<p class="muted pad">No categories yet.</p>'}
  </section>`;
  $<HTMLFormElement>('[data-add]', pane)!.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const v = formValues(form);
    withBusy(form.querySelector('button'), async () => { await call('save_category', { id: null, name: v.name, sortOrder: Number(v.sort) || 0 }); toast('Category added'); await categoriesPane(pane); });
  });
  pane.onclick = async (e) => {
    const t = e.target as HTMLElement;
    const li = t.closest<HTMLElement>('li[data-id]');
    if (!li) return;
    const id = Number(li.dataset.id);
    if (t.closest('[data-save]')) withBusy(t.closest('button'), async () => {
      await call('save_category', { id, name: ($('[data-name]', li) as HTMLInputElement).value, sortOrder: Number(($('[data-sort]', li) as HTMLInputElement).value) || 0 });
      toast('Category saved'); await categoriesPane(pane);
    });
    if (t.closest('[data-del]')) {
      if (await confirmDialog({ title: 'Delete this category?', message: 'Items in it are kept and become uncategorised.', confirm: 'Delete category', danger: true }) === null) return;
      try { await call('delete_category', { id }); toast('Category deleted'); await categoriesPane(pane); } catch (x) { toast(errText(x), 'error'); }
    }
  };
}

// ---------------------------------------------------------------- history

async function historyPane(pane: HTMLElement) {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
  pane.innerHTML = `<div class="toolbar">
      <select data-h="product" aria-label="${esc(store.label('item'))}"><option value="">All ${esc(store.label('items').toLowerCase())}</option>${store.products.filter((p) => p.track_stock).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
      <label class="date-field"><span>From</span><input type="date" data-h="from" value="${isoDate(from)}"></label>
      <label class="date-field"><span>To</span><input type="date" data-h="to" value="${isoDate(today)}"></label>
      <button class="btn btn-ghost" data-hexport>${icon('download', 16)} Export</button>
    </div><section class="panel flush" data-hist></section>`;
  let rows: Movement[] = [];
  const load = async () => {
    const val = (k: string) => ($(`[data-h="${k}"]`, pane) as HTMLInputElement).value;
    rows = await call<Movement[]>('list_movements', { productId: val('product') ? Number(val('product')) : null, from: val('from'), to: val('to') });
    $('[data-hist]', pane)!.innerHTML = rows.length ? `<div class="table-scroll"><table class="table">
      <thead><tr><th>When</th><th>${esc(store.label('item'))}</th><th>Change</th><th class="num">Quantity</th><th>Note</th><th>By</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(relativeDay(r.created_at))}</td><td>${esc(r.product_name)}</td><td><span class="move move-${r.quantity_delta >= 0 ? 'in' : 'out'}">${esc(MOVE_LABEL[r.movement_type] ?? r.movement_type)}</span></td>
        <td class="num"><b class="${r.quantity_delta >= 0 ? 'ok-text' : ''}">${r.quantity_delta >= 0 ? '+' : '−'}${qty(Math.abs(r.quantity_delta))}</b> <small class="muted">${esc(r.unit)}</small></td>
        <td>${esc(r.note)}${r.receipt_no ? ` <small class="muted">${esc(r.receipt_no)}</small>` : ''}</td><td>${esc(r.user_name || '—')}</td></tr>`).join('')}</tbody></table></div>`
      : emptyState('No stock changes', 'Nothing was received, sold or adjusted in this period.');
  };
  await load();
  pane.onchange = (e) => { if ((e.target as HTMLElement).closest('[data-h]')) load().catch((x) => toast(errText(x), 'error')); };
  pane.onclick = (e) => {
    if (!(e.target as HTMLElement).closest('[data-hexport]')) return;
    exportCsv(`stock-history-${isoDate(new Date())}.csv`, ['Date', 'Item', 'Change', 'Quantity', 'Unit', 'Unit cost', 'Note', 'Receipt', 'By'],
      rows.map((r) => [r.created_at, r.product_name, MOVE_LABEL[r.movement_type] ?? r.movement_type, r.quantity_delta, r.unit, nairaPlain(r.unit_cost_kobo), r.note, r.receipt_no, r.user_name]));
  };
}
